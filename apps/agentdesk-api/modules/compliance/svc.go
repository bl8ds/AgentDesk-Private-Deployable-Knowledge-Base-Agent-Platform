package compliance

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"agentdesk.example/api/pkg/apperr"
)

const (
	defaultRefusal = "抱歉，当前知识库中没有足够依据回答这个问题。请补充相关资料后再试，或联系管理员。"
	defaultHint    = "以上内容仅供参考，请结合原始资料核实。"
)

// Snapshot is loaded once per chat request and reused for input/output checks.
type Snapshot struct {
	Settings SettingsRow
	Terms    []TermRow
	MaxLen   int // longest enabled term, in runes
}

type Match struct {
	Term       string `json:"term"`
	Level      string `json:"level"`
	Category   string `json:"category"`
	Suggestion string `json:"suggestion"`
}

type CheckResult struct {
	Matches  []Match `json:"matches"`
	Blocked  bool    `json:"blocked"`
	Warned   bool    `json:"warned"`
	Redacted string  `json:"redacted,omitempty"`
}

type SettingsView struct {
	InputAction          string    `json:"input_action"`
	OutputAction         string    `json:"output_action"`
	Mask                 string    `json:"mask"`
	RefuseWithoutEvidence bool     `json:"refuse_without_evidence"`
	RefusalTemplate      string    `json:"refusal_template"`
	LowConfidenceHint    string    `json:"low_confidence_hint"`
	UpdatedBy            string    `json:"updated_by"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type SettingsInput struct {
	InputAction           *string `json:"input_action"`
	OutputAction          *string `json:"output_action"`
	Mask                  *string `json:"mask"`
	RefuseWithoutEvidence *bool   `json:"refuse_without_evidence"`
	RefusalTemplate       *string `json:"refusal_template"`
	LowConfidenceHint     *string `json:"low_confidence_hint"`
}

type TermInput struct {
	Term       *string `json:"term"`
	Level      *string `json:"level"`
	Category   *string `json:"category"`
	Suggestion *string `json:"suggestion"`
	Enabled    *bool   `json:"enabled"`
}

type Service struct {
	store *Store
}

func NewService(store *Store) *Service { return &Service{store: store} }

func defaultSettings() *SettingsRow {
	return &SettingsRow{
		ID:                    1,
		InputAction:           "block",
		OutputAction:          "redact",
		Mask:                  "***",
		RefuseWithoutEvidence: true,
		RefusalTemplate:       defaultRefusal,
		LowConfidenceHint:     defaultHint,
	}
}

func settingView(row *SettingsRow) SettingsView {
	return SettingsView{
		InputAction:           row.InputAction,
		OutputAction:          row.OutputAction,
		Mask:                  row.Mask,
		RefuseWithoutEvidence: row.RefuseWithoutEvidence,
		RefusalTemplate:       row.RefusalTemplate,
		LowConfidenceHint:     row.LowConfidenceHint,
		UpdatedBy:             row.UpdatedBy,
		UpdatedAt:             row.UpdatedAt,
	}
}

func (s *Service) GetSettings(ctx context.Context) (SettingsView, error) {
	row, err := s.store.GetSettings(ctx)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return settingView(defaultSettings()), nil
	}
	if err != nil {
		return SettingsView{}, apperr.Internal("load compliance settings", err)
	}
	return settingView(row), nil
}

func (s *Service) UpdateSettings(ctx context.Context, actor string, in SettingsInput) (SettingsView, error) {
	row, err := s.store.GetSettings(ctx)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = defaultSettings()
		row.CreatedAt = time.Now().UTC()
	} else if err != nil {
		return SettingsView{}, apperr.Internal("load compliance settings", err)
	}

	applyEnum := func(dst *string, src *string, allowed ...string) error {
		if src == nil {
			return nil
		}
		v := strings.ToLower(strings.TrimSpace(*src))
		for _, a := range allowed {
			if v == a {
				*dst = v
				return nil
			}
		}
		return apperr.Validation("invalid_value", "unsupported value: "+v)
	}
	if err := applyEnum(&row.InputAction, in.InputAction, "off", "warn", "block"); err != nil {
		return SettingsView{}, err
	}
	if err := applyEnum(&row.OutputAction, in.OutputAction, "off", "warn", "redact"); err != nil {
		return SettingsView{}, err
	}
	if in.Mask != nil {
		mask := strings.TrimSpace(*in.Mask)
		if mask == "" {
			mask = "***"
		}
		row.Mask = mask
	}
	if in.RefuseWithoutEvidence != nil {
		row.RefuseWithoutEvidence = *in.RefuseWithoutEvidence
	}
	if in.RefusalTemplate != nil {
		v := strings.TrimSpace(*in.RefusalTemplate)
		if v == "" {
			v = defaultRefusal
		}
		row.RefusalTemplate = v
	}
	if in.LowConfidenceHint != nil {
		row.LowConfidenceHint = strings.TrimSpace(*in.LowConfidenceHint)
	}
	row.UpdatedBy = actor

	if err := s.store.UpsertSettings(ctx, row); err != nil {
		return SettingsView{}, apperr.Internal("save compliance settings", err)
	}
	return settingView(row), nil
}

func (s *Service) ListTerms(ctx context.Context) ([]TermRow, error) {
	items, err := s.store.ListTerms(ctx, false)
	if err != nil {
		return nil, apperr.Internal("list sensitive terms", err)
	}
	return items, nil
}

func (s *Service) CreateTerm(ctx context.Context, in TermInput) (TermRow, error) {
	term, err := normalizeTerm(in)
	if err != nil {
		return TermRow{}, err
	}
	existing, err := s.store.ListTerms(ctx, false)
	if err != nil {
		return TermRow{}, apperr.Internal("list sensitive terms", err)
	}
	for _, t := range existing {
		if strings.EqualFold(t.Term, term.Term) {
			return TermRow{}, apperr.Validation("duplicate_term", "敏感词已存在")
		}
	}
	now := time.Now().UTC()
	row := TermRow{
		ID:         uuid.NewString(),
		Term:       term.Term,
		Level:      term.Level,
		Category:   term.Category,
		Suggestion: term.Suggestion,
		Enabled:    term.Enabled,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := s.store.CreateTerm(ctx, &row); err != nil {
		return TermRow{}, apperr.Internal("create sensitive term", err)
	}
	return row, nil
}

func normalizeTerm(in TermInput) (*TermRow, error) {
	if in.Term == nil || strings.TrimSpace(*in.Term) == "" {
		return nil, apperr.Validation("invalid_term", "term is required")
	}
	level := "block"
	if in.Level != nil {
		v := strings.ToLower(strings.TrimSpace(*in.Level))
		if v != "warn" && v != "block" {
			return nil, apperr.Validation("invalid_level", "level must be warn or block")
		}
		level = v
	}
	row := &TermRow{
		Term:       strings.TrimSpace(*in.Term),
		Level:      level,
		Suggestion: "",
		Enabled:    true,
	}
	if in.Category != nil {
		row.Category = strings.TrimSpace(*in.Category)
	}
	if in.Suggestion != nil {
		row.Suggestion = strings.TrimSpace(*in.Suggestion)
	}
	if in.Enabled != nil {
		row.Enabled = *in.Enabled
	}
	return row, nil
}

func (s *Service) UpdateTerm(ctx context.Context, id string, in TermInput) (TermRow, error) {
	all, err := s.store.ListTerms(ctx, false)
	if err != nil {
		return TermRow{}, apperr.Internal("list sensitive terms", err)
	}
	var row *TermRow
	for i := range all {
		if all[i].ID == id {
			row = &all[i]
			break
		}
	}
	if row == nil {
		return TermRow{}, apperr.NotFound("TERM_NOT_FOUND", "敏感词不存在")
	}

	if in.Term != nil {
		v := strings.TrimSpace(*in.Term)
		if v == "" {
			return TermRow{}, apperr.Validation("invalid_term", "term is required")
		}
		for _, t := range all {
			if t.ID != id && strings.EqualFold(t.Term, v) {
				return TermRow{}, apperr.Validation("duplicate_term", "敏感词已存在")
			}
		}
		row.Term = v
	}
	if in.Level != nil {
		v := strings.ToLower(strings.TrimSpace(*in.Level))
		if v != "warn" && v != "block" {
			return TermRow{}, apperr.Validation("invalid_level", "level must be warn or block")
		}
		row.Level = v
	}
	if in.Category != nil {
		row.Category = strings.TrimSpace(*in.Category)
	}
	if in.Suggestion != nil {
		row.Suggestion = strings.TrimSpace(*in.Suggestion)
	}
	if in.Enabled != nil {
		row.Enabled = *in.Enabled
	}
	if err := s.store.UpdateTerm(ctx, row); err != nil {
		return TermRow{}, apperr.Internal("update sensitive term", err)
	}
	return *row, nil
}

func (s *Service) DeleteTerm(ctx context.Context, id string) error {
	if err := s.store.DeleteTerm(ctx, id); err != nil {
		return apperr.Internal("delete sensitive term", err)
	}
	return nil
}

// Snapshot loads the full rule set once per request.
func (s *Service) Snapshot(ctx context.Context) (Snapshot, error) {
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return Snapshot{}, err
	}
	terms, err := s.store.ListTerms(ctx, true)
	if err != nil {
		return Snapshot{}, apperr.Internal("list sensitive terms", err)
	}
	maxLen := 0
	for _, t := range terms {
		if n := len([]rune(t.Term)); n > maxLen {
			maxLen = n
		}
	}
	if maxLen < 8 {
		maxLen = 8
	}
	row := SettingsRow{
		InputAction:           settings.InputAction,
		OutputAction:          settings.OutputAction,
		Mask:                  settings.Mask,
		RefuseWithoutEvidence: settings.RefuseWithoutEvidence,
		RefusalTemplate:       settings.RefusalTemplate,
		LowConfidenceHint:     settings.LowConfidenceHint,
	}
	return Snapshot{Settings: row, Terms: terms, MaxLen: maxLen}, nil
}

// Check detects sensitive terms in text. Longest terms are reported first.
func Check(text string, snap Snapshot) CheckResult {
	res := CheckResult{}
	if len(snap.Terms) == 0 || strings.TrimSpace(text) == "" {
		return res
	}
	lower := strings.ToLower(text)
	seen := map[string]bool{}
	for _, t := range snap.Terms {
		key := strings.ToLower(t.Term)
		if key == "" || seen[key] || !strings.Contains(lower, key) {
			continue
		}
		seen[key] = true
		res.Matches = append(res.Matches, Match{
			Term:       t.Term,
			Level:      t.Level,
			Category:   t.Category,
			Suggestion: t.Suggestion,
		})
		if t.Level == "block" {
			res.Blocked = true
		} else {
			res.Warned = true
		}
	}
	sort.Slice(res.Matches, func(i, j int) bool {
		return len([]rune(res.Matches[i].Term)) > len([]rune(res.Matches[j].Term))
	})
	return res
}

// Redact replaces every matched term with the configured mask.
func Redact(text string, snap Snapshot) string {
	mask := snap.Settings.Mask
	if mask == "" {
		mask = "***"
	}
	out := text
	terms := append([]TermRow(nil), snap.Terms...)
	sort.Slice(terms, func(i, j int) bool {
		return len([]rune(terms[i].Term)) > len([]rune(terms[j].Term))
	})
	for _, t := range terms {
		out = replaceFold(out, t.Term, mask)
	}
	return out
}

func replaceFold(s, old, new string) string {
	if old == "" {
		return s
	}
	lowerS := strings.ToLower(s)
	lowerOld := strings.ToLower(old)
	var b strings.Builder
	for {
		i := strings.Index(lowerS, lowerOld)
		if i < 0 {
			b.WriteString(s)
			return b.String()
		}
		b.WriteString(s[:i])
		b.WriteString(new)
		s = s[i+len(old):]
		lowerS = lowerS[i+len(lowerOld):]
	}
}
