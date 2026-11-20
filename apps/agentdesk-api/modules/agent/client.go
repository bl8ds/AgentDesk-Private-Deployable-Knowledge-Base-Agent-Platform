package agent

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			// Chat SSE / vision / ingest can run long (large docs → many embeddings).
			Timeout: 10 * time.Minute,
		},
	}
}

func (c *Client) Health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/health", nil)
	if err != nil {
		return err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("agent health status %d", resp.StatusCode)
	}
	return nil
}

type IngestChunk struct {
	Index   int    `json:"index"`
	Content string `json:"content"`
}

type IngestRequest struct {
	DocumentID  string        `json:"document_id"`
	Filename    string        `json:"filename"`
	ContentType string        `json:"content_type,omitempty"`
	Chunks      []IngestChunk `json:"chunks"`
}

func (c *Client) Ingest(ctx context.Context, docID, filename, contentType string, chunks []IngestChunk) error {
	body, err := json.Marshal(IngestRequest{
		DocumentID:  docID,
		Filename:    filename,
		ContentType: contentType,
		Chunks:      chunks,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/ingest", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("agent ingest status %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

type Citation struct {
	DocumentID string `json:"document_id"`
	ChunkID    string `json:"chunk_id"`
	Filename   string `json:"filename,omitempty"`
	Snippet    string `json:"snippet"`
}

type ChatStreamRequest struct {
	Message    string     `json:"message"`
	ThreadID   string     `json:"thread_id,omitempty"`
	ResourceID string     `json:"resource_id,omitempty"`
	Think      bool       `json:"think,omitempty"`
	Citations  []Citation `json:"citations,omitempty"`
}

type StreamEvent struct {
	Event string
	Data  json.RawMessage
}

// ChatStream proxies to agentdesk-agent custom /api/chat SSE route.
func (c *Client) ChatStream(ctx context.Context, message, threadID, resourceID string, think bool, citations []Citation, emit func(StreamEvent) error) error {
	body, err := json.Marshal(ChatStreamRequest{
		Message:    message,
		ThreadID:   threadID,
		ResourceID: resourceID,
		Think:      think,
		Citations:  citations,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("agent chat status %d: %s", resp.StatusCode, string(b))
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	var eventName string
	var dataBuf strings.Builder
	flush := func() error {
		if eventName == "" && dataBuf.Len() == 0 {
			return nil
		}
		name := eventName
		if name == "" {
			name = "message"
		}
		err := emit(StreamEvent{Event: name, Data: json.RawMessage(dataBuf.String())})
		eventName = ""
		dataBuf.Reset()
		return err
	}
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			if err := flush(); err != nil {
				return err
			}
			continue
		}
		if strings.HasPrefix(line, "event:") {
			eventName = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
			continue
		}
		if strings.HasPrefix(line, "data:") {
			if dataBuf.Len() > 0 {
				dataBuf.WriteByte('\n')
			}
			dataBuf.WriteString(strings.TrimSpace(strings.TrimPrefix(line, "data:")))
		}
	}
	if err := flush(); err != nil {
		return err
	}
	return scanner.Err()
}

// ListThreads proxies agentdesk-agent conversation thread listing when available.
func (c *Client) ListThreads(ctx context.Context, resourceID string) (json.RawMessage, error) {
	url := c.baseURL + "/api/threads"
	if resourceID != "" {
		url += "?resourceId=" + resourceID
	}
	return c.getJSON(ctx, url)
}

// GetMessages proxies agentdesk-agent thread messages when available.
func (c *Client) GetMessages(ctx context.Context, threadID, resourceID string) (json.RawMessage, error) {
	if threadID == "" {
		return nil, fmt.Errorf("thread id required")
	}
	url := c.baseURL + "/api/threads/" + threadID + "/messages"
	if resourceID != "" {
		url += "?resourceId=" + resourceID
	}
	return c.getJSON(ctx, url)
}

// UpdateThreadTitle renames a conversation thread for the owning resource.
func (c *Client) UpdateThreadTitle(ctx context.Context, threadID, resourceID, title string) (json.RawMessage, error) {
	if threadID == "" {
		return nil, fmt.Errorf("thread id required")
	}
	body, err := json.Marshal(map[string]string{
		"resourceId": resourceID,
		"title":      title,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, c.baseURL+"/api/threads/"+threadID, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("agent PATCH thread status %d: %s", resp.StatusCode, string(b))
	}
	var env struct {
		Success *bool           `json:"success"`
		Data    json.RawMessage `json:"data"`
		Error   string          `json:"error"`
	}
	if err := json.Unmarshal(b, &env); err == nil && env.Data != nil && (env.Success == nil || *env.Success) {
		if env.Error != "" {
			return nil, fmt.Errorf("%s", env.Error)
		}
		return env.Data, nil
	}
	return json.RawMessage(b), nil
}

// VisionExtract asks agentdesk-agent to run local Ollama vision on image bytes.
func (c *Client) VisionExtract(ctx context.Context, contentType string, data []byte) (string, error) {
	body, err := json.Marshal(map[string]string{
		"content_type":   contentType,
		"content_base64": base64.StdEncoding.EncodeToString(data),
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/vision-extract", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("vision-extract status %d: %s", resp.StatusCode, string(b))
	}
	var out struct {
		Success bool `json:"success"`
		Data    struct {
			Text string `json:"text"`
		} `json:"data"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(b, &out); err != nil {
		return "", err
	}
	if out.Error != "" {
		return "", fmt.Errorf("%s", out.Error)
	}
	if strings.TrimSpace(out.Data.Text) == "" {
		return "", fmt.Errorf("empty vision text")
	}
	return out.Data.Text, nil
}

// ToolInvocation is the definition sent to the agent runtime for a one-off
// tool test. It mirrors the agent_tools row shape without DB internals.
type ToolInvocation struct {
	Name        string `json:"name"`
	Kind        string `json:"kind"`
	Description string `json:"description,omitempty"`
	Config      string `json:"config"`
	InputSchema string `json:"input_schema"`
}

// InvokeTool asks the agent runtime to execute a tool definition with sample
// input (used by the admin "test tool" panel). Never exposes model keys.
func (c *Client) InvokeTool(ctx context.Context, def ToolInvocation, input map[string]interface{}) (json.RawMessage, error) {
	body, err := json.Marshal(map[string]interface{}{
		"tool":  def,
		"input": input,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/tools/invoke", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("tool invoke status %d: %s", resp.StatusCode, string(b))
	}
	var env struct {
		Success bool            `json:"success"`
		Data    json.RawMessage `json:"data"`
		Error   string          `json:"error"`
	}
	if err := json.Unmarshal(b, &env); err != nil {
		return nil, err
	}
	if env.Error != "" {
		return nil, fmt.Errorf("%s", env.Error)
	}
	if env.Data != nil {
		return env.Data, nil
	}
	return json.RawMessage(b), nil
}

// Unindex removes vector rows for a document from the agent index.
func (c *Client) Unindex(ctx context.Context, documentID string) error {
	body, err := json.Marshal(map[string]string{"document_id": documentID})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/unindex", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
	if resp.StatusCode >= 300 {
		return fmt.Errorf("agent unindex status %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

func (c *Client) getJSON(ctx context.Context, url string) (json.RawMessage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("agent GET %s status %d: %s", url, resp.StatusCode, string(b))
	}
	// Unwrap {success,data} envelopes from agentdesk-agent custom routes.
	var env struct {
		Success *bool           `json:"success"`
		Data    json.RawMessage `json:"data"`
		Error   string          `json:"error"`
	}
	if err := json.Unmarshal(b, &env); err == nil && env.Data != nil && (env.Success == nil || *env.Success) {
		if env.Error != "" {
			return nil, fmt.Errorf("%s", env.Error)
		}
		return env.Data, nil
	}
	return json.RawMessage(b), nil
}