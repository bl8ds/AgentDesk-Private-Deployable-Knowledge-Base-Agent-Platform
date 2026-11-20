package chat

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"agentdesk.example/api/internal/ratelimit"
	"agentdesk.example/api/modules/audit"
	"agentdesk.example/api/modules/authz"
	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

type Handler struct {
	svc   *Service
	docs  ContentOpener
	audit *audit.Service
	limit *ratelimit.Limiter
}

// ContentOpener loads corpus blobs for citation preview (chat users).
type ContentOpener interface {
	OpenContentMeta(ctx context.Context, id uuid.UUID) (filename string, contentType string, body io.ReadCloser, err error)
}

func NewHandler(svc *Service, auditSvc *audit.Service, limit *ratelimit.Limiter, docs ContentOpener) *Handler {
	return &Handler{svc: svc, audit: auditSvc, limit: limit, docs: docs}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.POST("/chat/completions", h.completions)
	r.GET("/chat/threads", h.listThreads)
	r.GET("/chat/threads/:id/messages", h.getMessages)
	r.PATCH("/chat/threads/:id", h.renameThread)
	r.GET("/chat/sources/:id/content", h.sourceContent)
}

func (h *Handler) completions(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	if err := h.limit.Allow(c.Request.Context(), "chat:completions:"+p.UserID); err != nil {
		httpx.Fail(c, err)
		return
	}
	var body struct {
		Message        string `json:"message"`
		ConversationID string `json:"conversation_id"`
		Think          bool   `json:"think"`
	}
	if err := httpx.BindJSON(c, &body); err != nil {
		httpx.Fail(c, err)
		return
	}

	sse, err := NewSSEWriter(c.Writer)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	c.Status(200)

	if h.audit != nil {
		h.audit.Write(c.Request.Context(), p.UserID, "chat.completions", "conversation", body.ConversationID, map[string]string{
			"message": body.Message,
		})
	}

	reqID, _ := c.Get("request_id")
	reqIDStr, _ := reqID.(string)

	err = h.svc.Completions(c.Request.Context(), CompleteInput{
		Message:        body.Message,
		ConversationID: body.ConversationID,
		Think:          body.Think,
		UserID:         p.UserID,
		UserLevel:      p.Level,
		RequestID:      reqIDStr,
	}, sse)
	if err != nil {
		_ = sse.Emit("error", map[string]string{"message": err.Error()})
	}
}

func (h *Handler) listThreads(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	// Never trust client-supplied resource_id.
	raw, err := h.svc.ListThreads(c.Request.Context(), p.UserID)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	var data interface{}
	if err := json.Unmarshal(raw, &data); err != nil {
		httpx.OK(c, 200, raw)
		return
	}
	httpx.OK(c, 200, data)
}

func (h *Handler) getMessages(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	raw, err := h.svc.GetMessages(c.Request.Context(), c.Param("id"), p.UserID)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	var data interface{}
	if err := json.Unmarshal(raw, &data); err != nil {
		httpx.OK(c, 200, raw)
		return
	}
	httpx.OK(c, 200, data)
}

func (h *Handler) renameThread(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	var body struct {
		Title string `json:"title"`
	}
	if err := httpx.BindJSON(c, &body); err != nil {
		httpx.Fail(c, err)
		return
	}
	raw, err := h.svc.UpdateThreadTitle(c.Request.Context(), c.Param("id"), p.UserID, body.Title)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	var data interface{}
	if err := json.Unmarshal(raw, &data); err != nil {
		httpx.OK(c, 200, raw)
		return
	}
	httpx.OK(c, 200, data)
}

func (h *Handler) sourceContent(c *gin.Context) {
	if _, ok := authz.PrincipalFromGin(c); !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	if h.docs == nil {
		httpx.Fail(c, apperr.Internal("source preview unavailable", nil))
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Fail(c, apperr.Validation("invalid_id", "invalid document id"))
		return
	}
	filename, contentType, body, err := h.docs.OpenContentMeta(c.Request.Context(), id)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	defer body.Close()

	ct := contentType
	if ct == "" {
		ct = "application/octet-stream"
	}
	c.Header("Content-Type", ct)
	c.Header("Content-Disposition", "inline; filename*=UTF-8''"+url.PathEscape(filename))
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, body)
}