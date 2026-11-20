package quota

import "github.com/gin-gonic/gin"

// MountMe registers end-user quota introspection (any authenticated principal).
func MountMe(r gin.IRoutes, h *Handler) {
	r.GET("/me/quota", h.me)
}

// MountAdmin registers quota administration (RequireAdmin upstream).
func MountAdmin(r gin.IRoutes, h *Handler) {
	r.GET("/admin/quotas/global", h.getGlobal)
	r.PUT("/admin/quotas/global", h.putGlobal)
	r.GET("/admin/quotas", h.list)
	r.GET("/admin/quotas/:userId", h.get)
	r.PUT("/admin/quotas/:userId", h.put)
	// Usage reporting (read-only aggregates + raw event list)
	r.GET("/admin/usage/report", h.usageReport)
	r.GET("/admin/usage", h.usageList)
}