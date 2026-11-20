package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"agentdesk.example/api/modules/agent"
	"agentdesk.example/api/modules/compliance"
	"agentdesk.example/api/modules/entitlement"
	"agentdesk.example/api/modules/quota"
	"agentdesk.example/api/pkg/apperr"
)

type Service struct {
	agent       *agent.Client
	entitlement *entitlement.Checker
	quota       *quota.Service
	compliance  *compliance.Service
}

func NewService(agentClient *agent.Client, checker *entitlement.Checker, quotaSvc *quota.Service, complianceSvc *compliance.Service) *Service {
	return &Service{
		agent:       agentClient,
		entitlement: checker,
		quota:       quotaSvc,
		compliance:  complianceSvc,
	}
}

type CompleteInput struct {
	Message        string `json:"message"`
	ConversationID string `json:"conversation_id"`
	Think          bool   `json:"think"`
	UserID         string
	UserLevel      string
	RequestID      string
}

type Emitter interface {
	Emit(event string, data interface{}) error
}

func (s *Service) Completions(ctx context.Context, in CompleteInput, emit Emitter) error {
	if strings.TrimSpace(in.Message) == "" {
		return apperr.Validation("invalid_message", "message is required")
	}
	if err := s.entitlement.Allow(in.UserLevel, entitlement.LevelFree); err != nil {
		return err
	}
	if s.quota != nil {
		if err := s.quota.EnsureAllowance(ctx, in.UserID); err != nil {
			return err
		}
	}

	// Content safety: load rules once per request, block/warn input and redact output.
	if s.compliance != nil {
		snap, err := s.compliance.Snapshot(ctx)
		if err != nil {
			return err
		}
		if snap.Settings.InputAction != "off" {
			res := compliance.Check(in.Message, snap)
			if len(res.Matches) > 0 {
				if res.Blocked && snap.Settings.InputAction == "block" {
					_ = emit.Emit("compliance_blocked", map[string]interface{}{
						"scope":      "input",
						"reason":     "sensitive_term",
						"matches":    res.Matches,
						"suggestion": firstSuggestion(res.Matches),
					})
					_ = emit.Emit("done", map[string]string{"conversation_id": in.ConversationID})
					return nil
				}
				_ = emit.Emit("compliance_warning", map[string]interface{}{
					"scope":   "input",
					"matches": res.Matches,
				})
			}
		}
		if snap.Settings.OutputAction == "redact" || snap.Settings.OutputAction == "warn" {
			emit = newRedactingEmitter(emit, snap)
		}
	}

	convID := in.ConversationID
	if convID == "" {
		convID = uuid.NewString()
	}

	// Commercial isolation: resource is always the authenticated user.
	resourceID := in.UserID
	if resourceID == "" {
		return apperr.Unauthorized("missing user")
	}

	if s.agent == nil {
		_ = emit.Emit("error", map[string]string{
			"code":    "UPSTREAM_ERROR",
			"message": "agent client not configured",
		})
		return nil
	}

	err := s.agent.ChatStream(ctx, in.Message, convID, resourceID, in.Think, nil, func(ev agent.StreamEvent) error {
		var payload interface{} = ev.Data
		var obj map[string]interface{}
		if json.Unmarshal(ev.Data, &obj) == nil {
			payload = obj
			if ev.Event == "usage" && s.quota != nil {
				ue := &quota.UsageEvent{
					UserID:           in.UserID,
					RequestID:        in.RequestID,
					Model:            strField(obj, "model"),
					PromptTokens:     int64Field(obj, "prompt_tokens"),
					CompletionTokens: int64Field(obj, "completion_tokens"),
					ReasoningTokens:  int64Field(obj, "reasoning_tokens"),
					TotalTokens:      int64Field(obj, "total_tokens"),
				}
				_ = s.quota.Record(ctx, ue)
			}
		} else {
			var str string
			if json.Unmarshal(ev.Data, &str) == nil {
				payload = map[string]string{"content": str}
			}
		}
		return emit.Emit(ev.Event, payload)
	})
	if err != nil {
		_ = emit.Emit("error", map[string]string{
			"code":    "UPSTREAM_ERROR",
			"message": err.Error(),
		})
		return nil
	}
	_ = emit.Emit("done", map[string]string{"conversation_id": convID})
	return nil
}

func firstSuggestion(matches []compliance.Match) string {
	for _, m := range matches {
		if m.Suggestion != "" {
			return m.Suggestion
		}
	}
	return ""
}

func strField(m map[string]interface{}, k string) string {
	v, _ := m[k].(string)
	return v
}

func int64Field(m map[string]interface{}, k string) int64 {
	switch v := m[k].(type) {
	case float64:
		return int64(v)
	case int64:
		return v
	case json.Number:
		n, _ := v.Int64()
		return n
	default:
		return 0
	}
}

func (s *Service) ListThreads(ctx context.Context, resourceID string) (json.RawMessage, error) {
	if s.agent == nil {
		return nil, apperr.Internal("agent client not configured", nil)
	}
	raw, err := s.agent.ListThreads(ctx, resourceID)
	if err != nil {
		return nil, apperr.Internal("UPSTREAM_ERROR", err)
	}
	return raw, nil
}

func (s *Service) GetMessages(ctx context.Context, threadID, resourceID string) (json.RawMessage, error) {
	if s.agent == nil {
		return nil, apperr.Internal("agent client not configured", nil)
	}
	raw, err := s.agent.GetMessages(ctx, threadID, resourceID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "403") || strings.Contains(msg, "forbidden") {
			return nil, apperr.Forbidden("THREAD_FORBIDDEN", "thread does not belong to user")
		}
		return nil, apperr.Internal("UPSTREAM_ERROR", err)
	}
	return raw, nil
}

func (s *Service) UpdateThreadTitle(ctx context.Context, threadID, resourceID, title string) (json.RawMessage, error) {
	if s.agent == nil {
		return nil, apperr.Internal("agent client not configured", nil)
	}
	title = strings.TrimSpace(title)
	if title == "" {
		return nil, apperr.Validation("invalid_title", "title is required")
	}
	raw, err := s.agent.UpdateThreadTitle(ctx, threadID, resourceID, title)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "403") || strings.Contains(msg, "forbidden") {
			return nil, apperr.Forbidden("THREAD_FORBIDDEN", "thread does not belong to user")
		}
		if strings.Contains(msg, "404") {
			return nil, apperr.NotFound("THREAD_NOT_FOUND", "thread not found")
		}
		return nil, apperr.Internal("UPSTREAM_ERROR", err)
	}
	return raw, nil
}

// SSEWriter writes Server-Sent Events to an http.ResponseWriter.
type SSEWriter struct {
	w http.ResponseWriter
	f http.Flusher
}

func NewSSEWriter(w http.ResponseWriter) (*SSEWriter, error) {
	f, ok := w.(http.Flusher)
	if !ok {
		return nil, apperr.Internal("streaming unsupported", nil)
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	return &SSEWriter{w: w, f: f}, nil
}

func (s *SSEWriter) Emit(event string, data interface{}) error {
	payload, err := json.Marshal(data)
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintf(s.w, "event: %s\ndata: %s\n\n", event, payload); err != nil {
		return err
	}
	s.f.Flush()
	return nil
}