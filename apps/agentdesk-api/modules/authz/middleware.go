package authz

import (
	"strings"

	"github.com/gin-gonic/gin"

	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

// Middleware requires a Bearer token and attaches Principal.
func Middleware(validator TokenValidator) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			httpx.Fail(c, apperr.Unauthorized("missing authorization header"))
			c.Abort()
			return
		}
		principal, err := validator.Validate(c.Request.Context(), strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			httpx.Fail(c, err)
			c.Abort()
			return
		}
		attachPrincipal(c, principal)
		c.Next()
	}
}

// SessionResolver looks up a session cookie token and returns a Principal.
type SessionResolver func(c *gin.Context, rawToken string) (*Principal, error)

// SessionOrBearer accepts either a session cookie or Bearer JWT.
// When Authorization: Bearer is present, it wins over the session cookie so
// an SPA OIDC token cannot be overridden by a stale agentdesk_session cookie.
func SessionOrBearer(cookieName string, resolveSession SessionResolver, validator TokenValidator) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if len(header) >= 7 && strings.EqualFold(header[:6], "Bearer") && header[6] == ' ' && validator != nil {
			raw := strings.TrimSpace(header[7:])
			if raw != "" {
				principal, err := validator.Validate(c.Request.Context(), raw)
				if err != nil {
					httpx.Fail(c, err)
					c.Abort()
					return
				}
				if principal != nil {
					attachPrincipal(c, principal)
					c.Next()
					return
				}
			}
		}

		if raw, err := c.Cookie(cookieName); err == nil && raw != "" {
			principal, err := resolveSession(c, raw)
			if err == nil && principal != nil {
				attachPrincipal(c, principal)
				c.Next()
				return
			}
		}

		httpx.Fail(c, apperr.Unauthorized("authentication required"))
		c.Abort()
	}
}

func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		p, ok := PrincipalFromGin(c)
		if !ok {
			httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
			c.Abort()
			return
		}
		if !p.IsAdmin() {
			httpx.Fail(c, ErrForbidden)
			c.Abort()
			return
		}
		c.Next()
	}
}

func PrincipalFromGin(c *gin.Context) (*Principal, bool) {
	if p, ok := FromContext(c.Request.Context()); ok {
		return p, true
	}
	raw, ok := c.Get("principal")
	if !ok {
		return nil, false
	}
	p, ok := raw.(*Principal)
	return p, ok
}

func attachPrincipal(c *gin.Context, p *Principal) {
	ctx := WithPrincipal(c.Request.Context(), p)
	c.Request = c.Request.WithContext(ctx)
	c.Set("principal", p)
}