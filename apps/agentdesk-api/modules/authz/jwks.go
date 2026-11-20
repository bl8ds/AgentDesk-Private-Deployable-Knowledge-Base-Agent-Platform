package authz

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"agentdesk.example/api/pkg/apperr"
)

// JWKSValidator validates RS256 tokens against a remote JWKS (openauth-auth).
type JWKSValidator struct {
	jwksURL    string
	httpClient *http.Client
	mu         sync.RWMutex
	keys       map[string]*rsa.PublicKey
	fetchedAt  time.Time
	ttl        time.Duration
}

func NewJWKSValidator(jwksURL string) *JWKSValidator {
	return &JWKSValidator{
		jwksURL: jwksURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		keys: make(map[string]*rsa.PublicKey),
		ttl:  5 * time.Minute,
	}
}

func (v *JWKSValidator) Validate(ctx context.Context, token string) (*Principal, error) {
	token = strings.TrimSpace(strings.TrimPrefix(token, "Bearer "))
	parsed, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if t.Method != jwt.SigningMethodRS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		kid, _ := t.Header["kid"].(string)
		return v.getKey(ctx, kid)
	})
	if err != nil || !parsed.Valid {
		return nil, apperr.Unauthorized("invalid token")
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return nil, apperr.Unauthorized("invalid claims")
	}
	return principalFromClaims(claims)
}

func (v *JWKSValidator) getKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	stale := time.Since(v.fetchedAt) >= v.ttl || len(v.keys) == 0
	key, ok := v.keys[kid]
	v.mu.RUnlock()

	if !stale && ok {
		return key, nil
	}
	if err := v.refresh(ctx); err != nil {
		return nil, err
	}

	v.mu.RLock()
	defer v.mu.RUnlock()
	key, ok = v.keys[kid]
	if !ok {
		if len(v.keys) == 1 {
			for _, k := range v.keys {
				return k, nil
			}
		}
		return nil, fmt.Errorf("kid %q not found", kid)
	}
	return key, nil
}

func (v *JWKSValidator) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks fetch status %d", resp.StatusCode)
	}

	var body jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return err
	}

	keys := make(map[string]*rsa.PublicKey)
	for _, k := range body.Keys {
		if k.Kty != "RSA" {
			continue
		}
		pub, err := parseRSAPublicKey(k.N, k.E)
		if err != nil {
			continue
		}
		kid := k.Kid
		if kid == "" {
			kid = "default"
		}
		keys[kid] = pub
	}

	v.mu.Lock()
	v.keys = keys
	v.fetchedAt = time.Now()
	v.mu.Unlock()
	return nil
}

type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

type jwkKey struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func parseRSAPublicKey(nB64, eB64 string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nB64)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eB64)
	if err != nil {
		return nil, err
	}
	n := new(big.Int).SetBytes(nBytes)
	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}
	return &rsa.PublicKey{N: n, E: e}, nil
}