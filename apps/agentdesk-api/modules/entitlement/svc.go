package entitlement

import (
	"strings"

	"agentdesk.example/api/pkg/apperr"
)

const (
	LevelFree = "free"
	LevelVIP  = "vip"
	LevelSVIP = "svip"
)

var rank = map[string]int{
	LevelFree: 0,
	LevelVIP:  1,
	LevelSVIP: 2,
}

// Checker gates AI features by user level.
type Checker struct{}

func NewChecker() *Checker {
	return &Checker{}
}

// Allow returns nil if level meets required.
func (c *Checker) Allow(level, required string) error {
	level = strings.ToLower(strings.TrimSpace(level))
	required = strings.ToLower(strings.TrimSpace(required))
	if required == "" {
		required = LevelFree
	}
	if level == "" {
		level = LevelFree
	}

	lr, okL := rank[level]
	rr, okR := rank[required]
	if !okL {
		return apperr.Forbidden("AI_NOT_ENTITLED", "unknown user level")
	}
	if !okR {
		return apperr.Validation("invalid_level", "unknown required level")
	}
	if lr < rr {
		return apperr.Forbidden("AI_NOT_ENTITLED", "user level does not allow this feature")
	}
	return nil
}