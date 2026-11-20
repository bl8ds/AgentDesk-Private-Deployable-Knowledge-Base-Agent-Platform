package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"agentdesk.example/api/config"
	"agentdesk.example/api/internal/db"
	"agentdesk.example/api/internal/logx"
	"agentdesk.example/api/internal/middleware"
	"agentdesk.example/api/internal/ratelimit"
	"agentdesk.example/api/internal/redisx"
	"agentdesk.example/api/internal/storage"
	"agentdesk.example/api/modules/agent"
	"agentdesk.example/api/modules/aisettings"
	"agentdesk.example/api/modules/audit"
	"agentdesk.example/api/modules/authz"
	"agentdesk.example/api/modules/chat"
	"agentdesk.example/api/modules/compliance"
	"agentdesk.example/api/modules/entitlement"
	"agentdesk.example/api/modules/health"
	"agentdesk.example/api/modules/knowledge"
	"agentdesk.example/api/modules/quota"
	"agentdesk.example/api/modules/session"
	"agentdesk.example/api/modules/tools"
)

type Server struct {
	cfg    *config.Config
	engine *gin.Engine
	http   *http.Server
}

func New() (*Server, error) {
	_ = godotenv.Load()
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	logx.Setup(cfg.LogLevel, cfg.LogFormat)

	if !cfg.IsDevelopment() {
		gin.SetMode(gin.ReleaseMode)
	}

	gdb, err := db.Open(cfg.DSN(""), cfg.DBLogLevel)
	if err != nil {
		return nil, err
	}

	rdb, err := redisx.New(cfg)
	if err != nil {
		return nil, err
	}

	s3store, err := storage.NewS3(context.Background(), cfg)
	if err != nil {
		return nil, err
	}

	validator := authz.NewJWKSValidator(cfg.AuthJWKSURL)
	agentClient := agent.NewClient(cfg.AgentBaseURL)

	sessionStore := session.NewStore(gdb, rdb)
	sessionSvc := session.NewService(sessionStore, cfg.SessionTTLHours)
	sessionHandler := session.NewHandler(
		sessionSvc,
		cfg.AppServiceCredential,
		cfg.SessionCookieName,
		!cfg.IsDevelopment(),
		cfg.SessionTTLHours,
	)

	auditStore := audit.NewStore(gdb)
	auditSvc := audit.NewService(auditStore)
	auditHandler := audit.NewHandler(auditSvc)

	knowledgeStore := knowledge.NewStore(gdb)
	knowledgeSvc := knowledge.NewService(knowledgeStore, s3store, agentClient)
	knowledgeHandler := knowledge.NewHandler(knowledgeSvc, auditSvc)

	quotaStore := quota.NewStore(gdb)
	quotaSvc := quota.NewService(quotaStore)
	quotaHandler := quota.NewHandler(quotaSvc, auditSvc)

	aiStore := aisettings.NewStore(gdb)
	aiSvc := aisettings.NewService(aiStore, cfg.ConfigEncryptionKey)
	aiHandler := aisettings.NewHandler(aiSvc, auditSvc)

	complianceStore := compliance.NewStore(gdb)
	complianceSvc := compliance.NewService(complianceStore)
	complianceHandler := compliance.NewHandler(complianceSvc)

	toolsStore := tools.NewStore(gdb)
	toolsSvc := tools.NewService(toolsStore)
	toolsHandler := tools.NewHandler(toolsSvc, agentClient)

	entChecker := entitlement.NewChecker()
	chatSvc := chat.NewService(agentClient, entChecker, quotaSvc, complianceSvc)
	var chatLimit *ratelimit.Limiter
	if cfg.ChatCompletionsRateLimit > 0 {
		chatLimit = ratelimit.New(
			rdb,
			"agentdesk:rl:",
			int64(cfg.ChatCompletionsRateLimit),
			time.Duration(cfg.ChatCompletionsRateWindow)*time.Second,
		)
	}
	chatHandler := chat.NewHandler(chatSvc, auditSvc, chatLimit, knowledgeSvc)

	engine := gin.New()
	engine.Use(gin.Recovery())
	engine.Use(middleware.RequestID())
	engine.Use(middleware.CORS(cfg.CORSOrigins))
	engine.Use(requestLogger())

	healthHandler := health.NewHandler(gdb, rdb, agentClient)
	healthHandler.Register(engine)

	api := engine.Group("/api/v1")

	authMW := authz.SessionOrBearer(cfg.SessionCookieName, func(c *gin.Context, raw string) (*authz.Principal, error) {
		return sessionSvc.ResolveToken(c.Request.Context(), raw)
	}, validator)

	session.Register(api, sessionHandler, cfg.SessionCookieName, sessionSvc, validator)
	knowledge.Register(api, knowledgeHandler, authMW)
	chat.Register(api, chatHandler, authMW)

	quotaAuthed := api.Group("", authMW)
	quota.MountMe(quotaAuthed, quotaHandler)
	quotaAdmin := api.Group("", authMW, authz.RequireAdmin())
	quota.MountAdmin(quotaAdmin, quotaHandler)
	aisettings.MountAdmin(quotaAdmin, aiHandler)
	compliance.MountAdmin(quotaAdmin, complianceHandler)
	tools.MountAdmin(quotaAdmin, toolsHandler)
	session.MountAdmin(quotaAdmin, sessionHandler)
	healthHandler.RegisterAdmin(quotaAdmin)

	audit.Register(api, auditHandler, authMW)

	slog.Info("server configured",
		"app_env", cfg.AppEnv,
		"db_host", cfg.DBHost,
		"auth_mode", cfg.AuthMode,
		"oidc_issuer", cfg.OIDCIssuer,
		"agent_base_url", cfg.AgentBaseURL,
		"s3_bucket", cfg.S3Bucket,
		"redis_addr", cfg.RedisAddr(),
	)

	return &Server{
		cfg:    cfg,
		engine: engine,
		http: &http.Server{
			Addr:              fmt.Sprintf(":%d", cfg.AppPort),
			Handler:           engine,
			ReadHeaderTimeout: 10 * time.Second,
		},
	}, nil
}

func (s *Server) Run() error {
	slog.Info("listening", "addr", s.http.Addr)
	return s.http.ListenAndServe()
}

func (s *Server) Handler() http.Handler {
	return s.engine
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}

func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}
		slog.Info("request",
			"method", c.Request.Method,
			"path", path,
			"status", c.Writer.Status(),
			"latency_ms", time.Since(start).Milliseconds(),
		)
	}
}