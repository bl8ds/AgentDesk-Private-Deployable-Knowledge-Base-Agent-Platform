package session

import (
	"github.com/gin-gonic/gin"

	"agentdesk.example/api/modules/authz"
)

// Register mounts auth routes. /auth/me requires SessionOrBearer.
func Register(api *gin.RouterGroup, h *Handler, cookieName string, svc *Service, validator authz.TokenValidator) {
	public := api.Group("")
	h.RegisterPublic(public)

	protected := api.Group("")
	protected.Use(authz.SessionOrBearer(cookieName, func(c *gin.Context, raw string) (*authz.Principal, error) {
		return svc.ResolveToken(c.Request.Context(), raw)
	}, validator))
	protected.GET("/auth/me", h.me)
}

func (h *Handler) RegisterPublic(r gin.IRoutes) {
	r.POST("/auth/app-code", h.appCode)
	r.POST("/auth/exchange", h.exchange)
}

// MountAdmin mounts session management (RequireAdmin applied by caller).
func MountAdmin(r gin.IRoutes, h *Handler) {
	r.GET("/admin/sessions", h.adminList)
	r.DELETE("/admin/sessions/:id", h.adminRevoke)
}