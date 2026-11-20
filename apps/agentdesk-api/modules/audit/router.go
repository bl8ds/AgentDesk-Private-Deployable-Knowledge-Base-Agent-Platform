package audit

import (
	"github.com/gin-gonic/gin"

	"agentdesk.example/api/modules/authz"
)

func Register(api *gin.RouterGroup, h *Handler, auth gin.HandlerFunc) {
	g := api.Group("")
	g.Use(auth)
	g.Use(authz.RequireAdmin())
	h.Register(g)
}