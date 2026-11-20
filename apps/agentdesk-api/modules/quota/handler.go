package quota

import (
	"net/http"
	"strconv"
	"time"

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

func (h *Handler) Register(r gin.IRoutes) {
	// Kept for tests; production mounts via MountMe / MountAdmin.
	MountMe(r, h)
	MountAdmin(r, h)
}

func (h *Handler) me(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	eq, err := h.svc.Resolve(c.Request.Context(), p.UserID)
	if err != nil {
		httpx.Fail(c, apperr.Internal("quota", err))
		return
	}
	httpx.OK(c, http.StatusOK, eq)
}

// requireAuth returns the principal (admin gate is applied by router middleware).
func (h *Handler) requireAuth(c *gin.Context) (*authz.Principal, bool) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return nil, false
	}
	return p, true
}

func (h *Handler) getGlobal(c *gin.Context) {
	if _, ok := h.requireAuth(c); !ok {
		return
	}
	g, used, err := h.svc.GetGlobal(c.Request.Context())
	if err != nil {
		httpx.Fail(c, apperr.Internal("quota global", err))
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{
		"mode":        g.Mode,
		"token_limit": g.TokenLimit,
		"used_tokens": used,
		"note":        g.Note,
		"updated_by":  g.UpdatedBy,
		"period":      time.Now().UTC().Format("2006-01"),
	})
}

func (h *Handler) putGlobal(c *gin.Context) {
	p, ok := h.requireAuth(c)
	if !ok {
		return
	}
	var body struct {
		Mode       string `json:"mode"`
		TokenLimit int64  `json:"token_limit"`
		Note       string `json:"note"`
	}
	if err := httpx.BindJSON(c, &body); err != nil {
		httpx.Fail(c, err)
		return
	}
	if body.TokenLimit < 0 {
		httpx.Fail(c, apperr.Validation("invalid_limit", "token_limit must be >= 0"))
		return
	}
	if body.Mode != ModeShared && body.Mode != ModePerUserDefault {
		httpx.Fail(c, apperr.Validation("invalid_mode", "mode must be shared or per_user_default"))
		return
	}
	g := &GlobalQuota{
		Mode:       body.Mode,
		TokenLimit: body.TokenLimit,
		Note:       body.Note,
		UpdatedBy:  p.UserID,
	}
	if err := h.svc.UpsertGlobal(c.Request.Context(), g); err != nil {
		httpx.Fail(c, apperr.Internal("upsert global quota", err))
		return
	}
	if h.audit != nil {
		h.audit.Write(c.Request.Context(), p.UserID, "quota.update_global", "quota", "global", map[string]interface{}{
			"mode": body.Mode, "token_limit": body.TokenLimit,
		})
	}
	httpx.OK(c, http.StatusOK, g)
}

func (h *Handler) list(c *gin.Context) {
	if _, ok := h.requireAuth(c); !ok {
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	items, err := h.svc.ListQuotas(c.Request.Context(), limit)
	if err != nil {
		httpx.Fail(c, apperr.Internal("list quotas", err))
		return
	}
	httpx.OK(c, http.StatusOK, items)
}

func (h *Handler) get(c *gin.Context) {
	if _, ok := h.requireAuth(c); !ok {
		return
	}
	userID := c.Param("userId")
	eq, err := h.svc.Resolve(c.Request.Context(), userID)
	if err != nil {
		httpx.Fail(c, apperr.Internal("quota", err))
		return
	}
	httpx.OK(c, http.StatusOK, eq)
}

// usageReport serves the aggregate dashboard data (trend + top users + totals).
func (h *Handler) usageReport(c *gin.Context) {
	if _, ok := h.requireAuth(c); !ok {
		return
	}
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	topN, _ := strconv.Atoi(c.DefaultQuery("top", "10"))
	report, err := h.svc.UsageReport(c.Request.Context(), days, topN)
	if err != nil {
		httpx.Fail(c, apperr.Internal("usage report", err))
		return
	}
	httpx.OK(c, http.StatusOK, report)
}

// usageList serves paginated raw usage events with optional filters.
func (h *Handler) usageList(c *gin.Context) {
	if _, ok := h.requireAuth(c); !ok {
		return
	}
	page, pageSize := httpx.ParsePage(c, 20)
	var from, to *time.Time
	if raw := c.Query("from"); raw != "" {
		if t, err := time.Parse(time.RFC3339, raw); err == nil {
			from = &t
		}
	}
	if raw := c.Query("to"); raw != "" {
		if t, err := time.Parse(time.RFC3339, raw); err == nil {
			to = &t
		}
	}
	items, pagination, err := h.svc.ListUsage(c.Request.Context(), page, pageSize, c.Query("user_id"), from, to)
	if err != nil {
		httpx.Fail(c, apperr.Internal("list usage", err))
		return
	}
	httpx.OK(c, http.StatusOK, httpx.ListData{Items: items, Pagination: pagination})
}

func (h *Handler) put(c *gin.Context) {
	p, ok := h.requireAuth(c)
	if !ok {
		return
	}
	var body struct {
		TokenLimit int64  `json:"token_limit"`
		Note       string `json:"note"`
	}
	if err := httpx.BindJSON(c, &body); err != nil {
		httpx.Fail(c, err)
		return
	}
	if body.TokenLimit < 0 {
		httpx.Fail(c, apperr.Validation("invalid_limit", "token_limit must be >= 0"))
		return
	}
	q := &UserQuota{
		UserID:     c.Param("userId"),
		TokenLimit: body.TokenLimit,
		Note:       body.Note,
		UpdatedBy:  p.UserID,
	}
	if err := h.svc.UpsertQuota(c.Request.Context(), q); err != nil {
		httpx.Fail(c, apperr.Internal("upsert quota", err))
		return
	}
	if h.audit != nil {
		h.audit.Write(c.Request.Context(), p.UserID, "quota.update_user", "quota", q.UserID, map[string]interface{}{
			"token_limit": body.TokenLimit,
		})
	}
	httpx.OK(c, http.StatusOK, q)
}