package tools

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"agentdesk.example/api/modules/agent"
	"agentdesk.example/api/modules/authz"
	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

type Handler struct {
	svc    *Service
	client *agent.Client
}

func NewHandler(svc *Service, client *agent.Client) *Handler {
	return &Handler{svc: svc, client: client}
}

func MountAdmin(r gin.IRoutes, h *Handler) {
	r.GET("/admin/tools", h.list)
	r.GET("/admin/tools/:id", h.get)
	r.POST("/admin/tools", h.create)
	r.PUT("/admin/tools/:id", h.update)
	r.DELETE("/admin/tools/:id", h.delete)
	r.POST("/admin/tools/:id/test", h.test)
}

func actorOf(c *gin.Context) string {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		return ""
	}
	return p.UserID
}

func (h *Handler) list(c *gin.Context) {
	items, err := h.svc.List(c.Request.Context())
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, items)
}

func (h *Handler) get(c *gin.Context) {
	row, err := h.svc.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, row)
}

func (h *Handler) create(c *gin.Context) {
	var body ToolInput
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Fail(c, apperr.Validation("invalid_body", "invalid json body"))
		return
	}
	row, err := h.svc.Create(c.Request.Context(), body)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, row)
}

func (h *Handler) update(c *gin.Context) {
	var body ToolInput
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Fail(c, apperr.Validation("invalid_body", "invalid json body"))
		return
	}
	row, err := h.svc.Update(c.Request.Context(), c.Param("id"), body)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, row)
}

func (h *Handler) delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id")); err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"deleted": true})
}

// test executes a tool through the agent runtime with sample input.
func (h *Handler) test(c *gin.Context) {
	row, err := h.svc.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	var body struct {
		Input map[string]interface{} `json:"input"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Fail(c, apperr.Validation("invalid_body", "invalid json body"))
		return
	}
	if body.Input == nil {
		body.Input = map[string]interface{}{}
	}
	if h.client == nil {
		httpx.Fail(c, apperr.Internal("agent client not configured", nil))
		return
	}
	result, err := h.client.InvokeTool(c.Request.Context(), agent.ToolInvocation{
		Name:        row.Name,
		Kind:        row.Kind,
		Description: row.Description,
		Config:      row.Config,
		InputSchema: row.InputSchema,
	}, body.Input)
	if err != nil {
		httpx.Fail(c, apperr.Internal("tool invocation failed", err))
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"success": true, "data": result})
}
