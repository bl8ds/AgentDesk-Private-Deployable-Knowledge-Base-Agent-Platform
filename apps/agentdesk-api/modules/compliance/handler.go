package compliance

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"agentdesk.example/api/modules/authz"
	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func MountAdmin(r gin.IRoutes, h *Handler) {
	r.GET("/admin/compliance/settings", h.getSettings)
	r.PUT("/admin/compliance/settings", h.putSettings)
	r.GET("/admin/compliance/terms", h.listTerms)
	r.POST("/admin/compliance/terms", h.createTerm)
	r.PUT("/admin/compliance/terms/:id", h.updateTerm)
	r.DELETE("/admin/compliance/terms/:id", h.deleteTerm)
	r.POST("/admin/compliance/test", h.testText)
}

func actorOf(c *gin.Context) string {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		return ""
	}
	return p.UserID
}

func (h *Handler) getSettings(c *gin.Context) {
	view, err := h.svc.GetSettings(c.Request.Context())
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, view)
}

func (h *Handler) putSettings(c *gin.Context) {
	var body SettingsInput
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Fail(c, apperr.Validation("invalid_body", "invalid json body"))
		return
	}
	view, err := h.svc.UpdateSettings(c.Request.Context(), actorOf(c), body)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, view)
}

func (h *Handler) listTerms(c *gin.Context) {
	items, err := h.svc.ListTerms(c.Request.Context())
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, items)
}

func (h *Handler) createTerm(c *gin.Context) {
	var body TermInput
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Fail(c, apperr.Validation("invalid_body", "invalid json body"))
		return
	}
	row, err := h.svc.CreateTerm(c.Request.Context(), body)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, row)
}

func (h *Handler) updateTerm(c *gin.Context) {
	var body TermInput
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Fail(c, apperr.Validation("invalid_body", "invalid json body"))
		return
	}
	row, err := h.svc.UpdateTerm(c.Request.Context(), c.Param("id"), body)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, row)
}

func (h *Handler) deleteTerm(c *gin.Context) {
	if err := h.svc.DeleteTerm(c.Request.Context(), c.Param("id")); err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"deleted": true})
}

func (h *Handler) testText(c *gin.Context) {
	var body struct {
		Text string `json:"text"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Fail(c, apperr.Validation("invalid_body", "invalid json body"))
		return
	}
	snap, err := h.svc.Snapshot(c.Request.Context())
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	res := Check(body.Text, snap)
	res.Redacted = Redact(body.Text, snap)
	httpx.OK(c, http.StatusOK, res)
}
