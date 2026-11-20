package chat

import (
	"github.com/gin-gonic/gin"
)

func Register(api *gin.RouterGroup, h *Handler, auth gin.HandlerFunc) {
	g := api.Group("")
	g.Use(auth)
	h.Register(g)
}