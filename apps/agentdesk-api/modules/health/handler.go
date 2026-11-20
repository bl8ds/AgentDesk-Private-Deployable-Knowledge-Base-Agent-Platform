package health

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"agentdesk.example/api/modules/agent"
	"agentdesk.example/api/modules/authz"
	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

type Handler struct {
	db    *gorm.DB
	rdb   *redis.Client
	agent *agent.Client
}

func NewHandler(db *gorm.DB, rdb *redis.Client, agentClient *agent.Client) *Handler {
	return &Handler{db: db, rdb: rdb, agent: agentClient}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/health", h.live)
	r.GET("/ready", h.ready)
}

// RegisterAdmin mounts the aggregated system health endpoint (RequireAdmin upstream).
func (h *Handler) RegisterAdmin(r gin.IRoutes) {
	r.GET("/admin/system/health", h.systemHealth)
}

func (h *Handler) systemHealth(c *gin.Context) {
	if _, ok := authz.PrincipalFromGin(c); !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	dbStatus := "up"
	sqlDB, err := h.db.DB()
	if err != nil || sqlDB.PingContext(ctx) != nil {
		dbStatus = "down"
	}
	redisStatus := "up"
	if h.rdb == nil || h.rdb.Ping(ctx).Err() != nil {
		redisStatus = "down"
	}
	agentStatus := "up"
	if h.agent == nil || h.agent.Health(ctx) != nil {
		agentStatus = "down"
	}
	status := "ok"
	if dbStatus == "down" || redisStatus == "down" || agentStatus == "down" {
		status = "degraded"
	}
	httpx.OK(c, http.StatusOK, gin.H{
		"status": status,
		"db":     dbStatus,
		"redis":  redisStatus,
		"agent":  agentStatus,
	})
}

func (h *Handler) live(c *gin.Context) {
	httpx.OK(c, http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) ready(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	sqlDB, err := h.db.DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "db": "down"})
		return
	}
	if err := sqlDB.PingContext(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "db": "down"})
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"status": "ok", "db": "up"})
}