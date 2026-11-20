package authz

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type stubValidator struct {
	p   *Principal
	err error
}

func (s stubValidator) Validate(ctx context.Context, token string) (*Principal, error) {
	if s.err != nil {
		return nil, s.err
	}
	if token == "" {
		return nil, nil
	}
	return s.p, nil
}

func TestSessionOrBearer_bearerWinsOverCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	bearerPrincipal := &Principal{UserID: "bearer-user", Roles: []string{"user"}, Channel: "bearer"}
	cookiePrincipal := &Principal{UserID: "cookie-user", Roles: []string{"admin"}, Channel: "session"}

	r := gin.New()
	r.GET("/me", SessionOrBearer("agentdesk_session", func(c *gin.Context, raw string) (*Principal, error) {
		if raw == "cookie-token" {
			return cookiePrincipal, nil
		}
		return nil, nil
	}, stubValidator{p: bearerPrincipal}), func(c *gin.Context) {
		p, ok := PrincipalFromGin(c)
		if !ok {
			c.Status(http.StatusUnauthorized)
			return
		}
		c.JSON(http.StatusOK, gin.H{"user_id": p.UserID})
	})

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.AddCookie(&http.Cookie{Name: "agentdesk_session", Value: "cookie-token"})
	req.Header.Set("Authorization", "Bearer oidc-token")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	if !contains(w.Body.String(), "bearer-user") {
		t.Fatalf("expected bearer principal, body=%s", w.Body.String())
	}
}

func TestSessionOrBearer_cookieWhenNoBearer(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cookiePrincipal := &Principal{UserID: "cookie-user", Channel: "session"}

	r := gin.New()
	r.GET("/me", SessionOrBearer("agentdesk_session", func(c *gin.Context, raw string) (*Principal, error) {
		return cookiePrincipal, nil
	}, stubValidator{}), func(c *gin.Context) {
		p, _ := PrincipalFromGin(c)
		c.JSON(http.StatusOK, gin.H{"user_id": p.UserID})
	})

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.AddCookie(&http.Cookie{Name: "agentdesk_session", Value: "cookie-token"})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK || !contains(w.Body.String(), "cookie-user") {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 ||
		(func() bool {
			for i := 0; i+len(sub) <= len(s); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
			return false
		})())
}