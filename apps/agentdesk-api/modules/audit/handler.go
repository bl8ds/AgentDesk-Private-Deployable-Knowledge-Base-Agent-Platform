package audit

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"agentdesk.example/api/pkg/httpx"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/audit", h.list)
	r.GET("/audit/actions", h.actions)
}

func (h *Handler) list(c *gin.Context) {
	page, pageSize := httpx.ParsePage(c, 20)
	f := ListFilter{
		Action:  c.Query("action"),
		ActorID: c.Query("actor_id"),
	}
	// Optional RFC3339 time bounds; invalid values are ignored.
	if raw := c.Query("from"); raw != "" {
		if t, err := time.Parse(time.RFC3339, raw); err == nil {
			f.From = &t
		}
	}
	if raw := c.Query("to"); raw != "" {
		if t, err := time.Parse(time.RFC3339, raw); err == nil {
			f.To = &t
		}
	}
	items, pagination, err := h.svc.List(c.Request.Context(), page, pageSize, f)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, httpx.ListData{Items: items, Pagination: pagination})
}

func (h *Handler) actions(c *gin.Context) {
	actions, err := h.svc.Actions(c.Request.Context())
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"actions": actions})
}