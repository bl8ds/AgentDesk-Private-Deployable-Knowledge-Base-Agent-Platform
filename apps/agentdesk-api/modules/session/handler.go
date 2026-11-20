package session

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"agentdesk.example/api/modules/authz"
	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

type Handler struct {
	svc             *Service
	appCredential   string
	cookieName      string
	cookieSecure    bool
	sessionTTLHours int
}

func NewHandler(svc *Service, appCredential, cookieName string, cookieSecure bool, ttlHours int) *Handler {
	return &Handler{
		svc:             svc,
		appCredential:   appCredential,
		cookieName:      cookieName,
		cookieSecure:    cookieSecure,
		sessionTTLHours: ttlHours,
	}
}

func (h *Handler) appCode(c *gin.Context) {
	cred := c.GetHeader("X-App-Credential")
	if cred == "" || cred != h.appCredential {
		httpx.Fail(c, apperr.Unauthorized("invalid app credential"))
		return
	}
	var body IssueCodeInput
	if err := httpx.BindJSON(c, &body); err != nil {
		httpx.Fail(c, err)
		return
	}
	res, err := h.svc.IssueAppCode(c.Request.Context(), body)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, res)
}

func (h *Handler) exchange(c *gin.Context) {
	var body struct {
		Code string `json:"code"`
	}
	if err := httpx.BindJSON(c, &body); err != nil {
		httpx.Fail(c, err)
		return
	}
	res, err := h.svc.Exchange(c.Request.Context(), body.Code)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	h.setSessionCookie(c, res.RawToken, res.ExpiresAt)
	httpx.OK(c, http.StatusOK, h.svc.Me(res.Principal))
}

func (h *Handler) me(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	httpx.OK(c, http.StatusOK, h.svc.Me(p))
}

// --- Admin session management (RequireAdmin applied by MountAdmin) ---

func (h *Handler) adminList(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	items, err := h.svc.ListSessions(c.Request.Context(), limit, c.Query("user_id"))
	if err != nil {
		httpx.Fail(c, apperr.Internal("list sessions", err))
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"sessions": items})
}

func (h *Handler) adminRevoke(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Fail(c, apperr.Validation("invalid_id", "invalid session id"))
		return
	}
	if err := h.svc.RevokeSession(c.Request.Context(), id); err != nil {
		httpx.Fail(c, apperr.Internal("revoke session", err))
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"revoked": true, "id": id.String()})
}

func (h *Handler) setSessionCookie(c *gin.Context, raw string, expires time.Time) {
	maxAge := int(time.Until(expires).Seconds())
	if maxAge < 0 {
		maxAge = 0
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(h.cookieName, raw, maxAge, "/", "", h.cookieSecure, true)
}