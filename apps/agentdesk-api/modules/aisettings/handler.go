package aisettings

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"agentdesk.example/api/modules/audit"
	"agentdesk.example/api/modules/authz"
	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

type Handler struct {
	svc   *Service
	audit *audit.Service
}

func NewHandler(svc *Service, auditSvc *audit.Service) *Handler {
	return &Handler{svc: svc, audit: auditSvc}
}

func MountAdmin(r gin.IRoutes, h *Handler) {
	r.GET("/admin/ai-settings", h.get)
	r.PUT("/admin/ai-settings", h.put)
}

func (h *Handler) get(c *gin.Context) {
	view, err := h.svc.GetPublic(c.Request.Context())
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, view)
}

func (h *Handler) put(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	var body UpdateInput
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Fail(c, apperr.Validation("invalid_body", "invalid json body"))
		return
	}
	view, err := h.svc.Update(c.Request.Context(), p.UserID, body)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	if h.audit != nil {
		h.audit.Write(c.Request.Context(), p.UserID, "ai_settings.update", "ai_settings", "global", map[string]interface{}{
			"chat_model": body.ChatModel, "embedding_model": body.EmbeddingModel,
		})
	}
	httpx.OK(c, http.StatusOK, view)
}