package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppEnv  string
	AppPort int

	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	DBLogLevel string

	AuthMode    string
	AuthJWKSURL string
	OIDCIssuer  string

	AppServiceCredential string

	SessionCookieName string
	SessionTTLHours   int

	RedisHost     string
	RedisPort     int
	RedisPassword string
	RedisDB       int

	S3Endpoint     string
	S3Region       string
	S3AccessKey    string
	S3SecretKey    string
	S3Bucket       string
	S3UsePathStyle bool

	AgentBaseURL string

	// CONFIG_ENCRYPTION_KEY seals runtime AI API keys at rest (AES-256-GCM).
	ConfigEncryptionKey string

	// ChatCompletionsRateLimit: max POST /chat/completions per user per window (0 = disable).
	ChatCompletionsRateLimit  int
	ChatCompletionsRateWindow int // seconds

	CORSOrigins []string

	LogLevel  string
	LogFormat string
}

func Load() (*Config, error) {
	cfg := &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnvInt("APP_PORT", 8080),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnvInt("DB_PORT", 5432),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "agentdesk"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		DBLogLevel: getEnv("DB_LOG_LEVEL", "silent"),

		AuthMode:    getEnv("AUTH_MODE", "jwks"),
		AuthJWKSURL: getEnv("AUTH_JWKS_URL", "https://auth.example.com/oauth/jwks"),
		OIDCIssuer:  getEnv("OIDC_ISSUER", "https://auth.example.com"),

		AppServiceCredential: getEnv("APP_SERVICE_CREDENTIAL", "dev-app-credential-change-me"),

		SessionCookieName: getEnv("SESSION_COOKIE_NAME", "agentdesk_session"),
		SessionTTLHours:   getEnvInt("SESSION_TTL_HOURS", 24),

		RedisHost:     getEnv("REDIS_HOST", "127.0.0.1"),
		RedisPort:     getEnvInt("REDIS_PORT", 6379),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 2),

		S3Endpoint:     getEnv("S3_ENDPOINT", "https://minio.example.com"),
		S3Region:       getEnv("S3_REGION", "us-east-1"),
		S3AccessKey:    getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:    getEnv("S3_SECRET_KEY", ""),
		S3Bucket:       getEnv("S3_BUCKET", "agentdesk"),
		S3UsePathStyle: getEnvBool("S3_USE_PATH_STYLE", true),

		AgentBaseURL: getEnv("AGENT_BASE_URL", "http://agentdesk-agent:4111"),

		ConfigEncryptionKey: getEnv("CONFIG_ENCRYPTION_KEY", ""),

		ChatCompletionsRateLimit:  getEnvInt("CHAT_COMPLETIONS_RATE_LIMIT", 10),
		ChatCompletionsRateWindow: getEnvInt("CHAT_COMPLETIONS_RATE_WINDOW_SEC", 60),

		CORSOrigins: splitCSV(getEnv("CORS_ORIGINS",
			"https://agentdesk-admin.example.com,https://agentdesk-chat.example.com,http://localhost:5173,http://localhost:5174")),

		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),
	}
	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) DSN(dbName string) string {
	name := dbName
	if name == "" {
		name = c.DBName
	}
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, name, c.DBSSLMode,
	)
}

func (c *Config) MigrateURL() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode,
	)
}

func (c *Config) IsDevelopment() bool {
	return c.AppEnv == "development" || c.AppEnv == "dev" || c.AppEnv == "test"
}

func (c *Config) RedisAddr() string {
	return fmt.Sprintf("%s:%d", c.RedisHost, c.RedisPort)
}

func (c *Config) validate() error {
	if c.AuthMode != "jwks" {
		return fmt.Errorf("invalid AUTH_MODE %q: only jwks is supported", c.AuthMode)
	}
	if c.AuthJWKSURL == "" {
		return fmt.Errorf("AUTH_JWKS_URL is required")
	}
	if c.AgentBaseURL == "" {
		return fmt.Errorf("AGENT_BASE_URL is required")
	}
	if c.SessionTTLHours < 1 {
		return fmt.Errorf("SESSION_TTL_HOURS must be >= 1")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvBool(key string, fallback bool) bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if v == "" {
		return fallback
	}
	switch v {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}