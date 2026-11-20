package quota

import (
	"context"
	"os"
	"strconv"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

const (
	ModeShared         = "shared"
	ModePerUserDefault = "per_user_default"
)

type UsageEvent struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID           string    `gorm:"column:user_id" json:"user_id"`
	RequestID        string    `gorm:"column:request_id" json:"request_id"`
	Model            string    `json:"model"`
	PromptTokens     int64     `gorm:"column:prompt_tokens" json:"prompt_tokens"`
	CompletionTokens int64     `gorm:"column:completion_tokens" json:"completion_tokens"`
	ReasoningTokens  int64     `gorm:"column:reasoning_tokens" json:"reasoning_tokens"`
	TotalTokens      int64     `gorm:"column:total_tokens" json:"total_tokens"`
	CreatedAt        time.Time `gorm:"column:created_at" json:"created_at"`
}

func (UsageEvent) TableName() string { return "usage_events" }

type UserQuota struct {
	UserID     string    `gorm:"column:user_id;primaryKey" json:"user_id"`
	TokenLimit int64     `gorm:"column:token_limit" json:"token_limit"`
	Note       string    `json:"note"`
	UpdatedBy  string    `gorm:"column:updated_by" json:"updated_by"`
	CreatedAt  time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (UserQuota) TableName() string { return "user_quotas" }

// GlobalQuota is a singleton row (id=1).
type GlobalQuota struct {
	ID         int16     `gorm:"column:id;primaryKey" json:"id"`
	Mode       string    `gorm:"column:mode" json:"mode"`
	TokenLimit int64     `gorm:"column:token_limit" json:"token_limit"`
	Note       string    `json:"note"`
	UpdatedBy  string    `gorm:"column:updated_by" json:"updated_by"`
	CreatedAt  time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (GlobalQuota) TableName() string { return "quota_global" }

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) *Store { return &Store{db: db} }

func defaultMonthlyLimit() int64 {
	v := os.Getenv("DEFAULT_MONTHLY_TOKEN_QUOTA")
	if v == "" {
		return 200_000
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n < 0 {
		return 200_000
	}
	return n
}

func (s *Store) GetGlobal(ctx context.Context) (*GlobalQuota, error) {
	var g GlobalQuota
	err := s.db.WithContext(ctx).Where("id = 1").First(&g).Error
	if err == gorm.ErrRecordNotFound {
		return &GlobalQuota{
			ID:         1,
			Mode:       ModeShared,
			TokenLimit: defaultMonthlyLimit(),
			Note:       "system default",
		}, nil
	}
	if err != nil {
		return nil, err
	}
	if g.Mode == "" {
		g.Mode = ModeShared
	}
	return &g, nil
}

func (s *Store) UpsertGlobal(ctx context.Context, g *GlobalQuota) error {
	now := time.Now().UTC()
	g.ID = 1
	g.UpdatedAt = now
	if g.CreatedAt.IsZero() {
		g.CreatedAt = now
	}
	if g.Mode != ModeShared && g.Mode != ModePerUserDefault {
		g.Mode = ModeShared
	}
	return s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"mode", "token_limit", "note", "updated_by", "updated_at"}),
	}).Create(g).Error
}

func (s *Store) FindUserQuota(ctx context.Context, userID string) (*UserQuota, error) {
	var q UserQuota
	err := s.db.WithContext(ctx).Where("user_id = ?", userID).First(&q).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &q, nil
}

func (s *Store) UpsertQuota(ctx context.Context, q *UserQuota) error {
	now := time.Now().UTC()
	q.UpdatedAt = now
	if q.CreatedAt.IsZero() {
		q.CreatedAt = now
	}
	return s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"token_limit", "note", "updated_by", "updated_at"}),
	}).Create(q).Error
}

func (s *Store) ListQuotas(ctx context.Context, limit int) ([]UserQuota, error) {
	if limit <= 0 {
		limit = 100
	}
	var items []UserQuota
	err := s.db.WithContext(ctx).Order("updated_at DESC").Limit(limit).Find(&items).Error
	return items, err
}

func (s *Store) MonthUsage(ctx context.Context, userID string, at time.Time) (int64, error) {
	start := time.Date(at.UTC().Year(), at.UTC().Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	var sum int64
	q := s.db.WithContext(ctx).Model(&UsageEvent{}).
		Select("COALESCE(SUM(total_tokens),0)").
		Where("created_at >= ? AND created_at < ?", start, end)
	if userID != "" {
		q = q.Where("user_id = ?", userID)
	}
	err := q.Scan(&sum).Error
	return sum, err
}

// UsageDaily is a per-day token aggregation for trend charts.
type UsageDaily struct {
	Day          string `json:"day"`
	TotalTokens  int64  `json:"total_tokens"`
	Requests     int64  `json:"requests"`
	PromptTokens int64  `json:"prompt_tokens"`
}

// UsageByUser is a per-user token aggregation for leaderboards.
type UsageByUser struct {
	UserID      string `json:"user_id"`
	TotalTokens int64  `json:"total_tokens"`
	Requests    int64  `json:"requests"`
}

// ListUsage returns paginated raw usage events with optional user filter and time window.
func (s *Store) ListUsage(ctx context.Context, page, pageSize int, userID string, from, to *time.Time) ([]UsageEvent, int64, error) {
	q := s.db.WithContext(ctx).Model(&UsageEvent{})
	if userID != "" {
		q = q.Where("user_id = ?", userID)
	}
	if from != nil {
		q = q.Where("created_at >= ?", *from)
	}
	if to != nil {
		q = q.Where("created_at <= ?", *to)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []UsageEvent
	err := q.Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&items).Error
	return items, total, err
}

// DailyUsage aggregates usage by calendar day (UTC) within [from, to).
func (s *Store) DailyUsage(ctx context.Context, from, to time.Time) ([]UsageDaily, error) {
	var rows []UsageDaily
	err := s.db.WithContext(ctx).Model(&UsageEvent{}).
		Select("to_char(created_at, 'YYYY-MM-DD') as day, "+
			"COALESCE(SUM(total_tokens),0) as total_tokens, "+
			"COUNT(*) as requests, "+
			"COALESCE(SUM(prompt_tokens),0) as prompt_tokens").
		Where("created_at >= ? AND created_at < ?", from, to).
		Group("day").Order("day ASC").Scan(&rows).Error
	return rows, err
}

// UsageByUserList aggregates usage grouped by user within [from, to), ranked by tokens.
func (s *Store) UsageByUserList(ctx context.Context, from, to time.Time, limit int) ([]UsageByUser, error) {
	if limit <= 0 {
		limit = 10
	}
	var rows []UsageByUser
	err := s.db.WithContext(ctx).Model(&UsageEvent{}).
		Select("user_id, COALESCE(SUM(total_tokens),0) as total_tokens, COUNT(*) as requests").
		Where("created_at >= ? AND created_at < ?", from, to).
		Group("user_id").Order("total_tokens DESC").Limit(limit).Scan(&rows).Error
	return rows, err
}

func (s *Store) RecordUsage(ctx context.Context, ev *UsageEvent) error {
	if ev.ID == uuid.Nil {
		ev.ID = uuid.New()
	}
	if ev.CreatedAt.IsZero() {
		ev.CreatedAt = time.Now().UTC()
	}
	if ev.TotalTokens == 0 {
		ev.TotalTokens = ev.PromptTokens + ev.CompletionTokens + ev.ReasoningTokens
	}
	return s.db.WithContext(ctx).Create(ev).Error
}

type Service struct {
	store *Store
}

func NewService(store *Store) *Service { return &Service{store: store} }

type EffectiveQuota struct {
	Scope      string `json:"scope"` // user | global_shared | global_per_user
	UserID     string `json:"user_id,omitempty"`
	Mode       string `json:"mode,omitempty"`
	TokenLimit int64  `json:"token_limit"`
	UsedTokens int64  `json:"used_tokens"`
	Note       string `json:"note,omitempty"`
	Period     string `json:"period"`
}

func (s *Service) Resolve(ctx context.Context, userID string) (*EffectiveQuota, error) {
	period := time.Now().UTC().Format("2006-01")
	now := time.Now().UTC()

	if personal, err := s.store.FindUserQuota(ctx, userID); err != nil {
		return nil, err
	} else if personal != nil {
		used, err := s.store.MonthUsage(ctx, userID, now)
		if err != nil {
			return nil, err
		}
		return &EffectiveQuota{
			Scope:      "user",
			UserID:     userID,
			TokenLimit: personal.TokenLimit,
			UsedTokens: used,
			Note:       personal.Note,
			Period:     period,
		}, nil
	}

	g, err := s.store.GetGlobal(ctx)
	if err != nil {
		return nil, err
	}
	if g.Mode == ModeShared {
		used, err := s.store.MonthUsage(ctx, "", now) // all users
		if err != nil {
			return nil, err
		}
		return &EffectiveQuota{
			Scope:      "global_shared",
			Mode:       g.Mode,
			TokenLimit: g.TokenLimit,
			UsedTokens: used,
			Note:       g.Note,
			Period:     period,
			UserID:     userID,
		}, nil
	}
	used, err := s.store.MonthUsage(ctx, userID, now)
	if err != nil {
		return nil, err
	}
	return &EffectiveQuota{
		Scope:      "global_per_user",
		Mode:       g.Mode,
		TokenLimit: g.TokenLimit,
		UsedTokens: used,
		Note:       g.Note,
		Period:     period,
		UserID:     userID,
	}, nil
}

func (s *Service) EnsureAllowance(ctx context.Context, userID string) error {
	eq, err := s.Resolve(ctx, userID)
	if err != nil {
		return apperr.Internal("quota lookup", err)
	}
	if eq.UsedTokens >= eq.TokenLimit {
		return apperr.Forbidden("QUOTA_EXCEEDED", "monthly token quota exceeded")
	}
	return nil
}

func (s *Service) Record(ctx context.Context, ev *UsageEvent) error {
	return s.store.RecordUsage(ctx, ev)
}

func (s *Service) GetQuota(ctx context.Context, userID string) (*UserQuota, int64, error) {
	eq, err := s.Resolve(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	return &UserQuota{
		UserID:     userID,
		TokenLimit: eq.TokenLimit,
		Note:       eq.Note + " [" + eq.Scope + "]",
	}, eq.UsedTokens, nil
}

func (s *Service) GetGlobal(ctx context.Context) (*GlobalQuota, int64, error) {
	g, err := s.store.GetGlobal(ctx)
	if err != nil {
		return nil, 0, err
	}
	now := time.Now().UTC()
	var used int64
	if g.Mode == ModeShared {
		used, err = s.store.MonthUsage(ctx, "", now)
	} else {
		// In per_user_default, "used" on global view = sum still useful as overview.
		used, err = s.store.MonthUsage(ctx, "", now)
	}
	if err != nil {
		return nil, 0, err
	}
	return g, used, nil
}

func (s *Service) UpsertGlobal(ctx context.Context, g *GlobalQuota) error {
	return s.store.UpsertGlobal(ctx, g)
}

func (s *Service) UpsertQuota(ctx context.Context, q *UserQuota) error {
	return s.store.UpsertQuota(ctx, q)
}

func (s *Service) ListQuotas(ctx context.Context, limit int) ([]UserQuota, error) {
	return s.store.ListQuotas(ctx, limit)
}

// --- Admin usage reporting (read-only) ---

// UsageReport bundles the dashboard data in one round trip.
type UsageReport struct {
	Period     string        `json:"period"`
	Total      int64         `json:"total_tokens"`
	Requests   int64         `json:"requests"`
	Daily      []UsageDaily  `json:"daily"`
	TopUsers   []UsageByUser `json:"top_users"`
}

func (s *Service) UsageReport(ctx context.Context, days int, topN int) (*UsageReport, error) {
	if days <= 0 {
		days = 30
	}
	now := time.Now().UTC()
	// Inclusive of today: window starts days-1 back at 00:00 UTC, ends tomorrow 00:00 UTC.
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -(days - 1))
	end := start.AddDate(0, 0, days)

	daily, err := s.store.DailyUsage(ctx, start, end)
	if err != nil {
		return nil, err
	}
	top, err := s.store.UsageByUserList(ctx, start, end, topN)
	if err != nil {
		return nil, err
	}
	var total, requests int64
	for _, d := range daily {
		total += d.TotalTokens
		requests += d.Requests
	}
	return &UsageReport{
		Period:   start.Format("2006-01-02") + " ~ " + end.AddDate(0, 0, -1).Format("2006-01-02"),
		Total:    total,
		Requests: requests,
		Daily:    daily,
		TopUsers: top,
	}, nil
}

func (s *Service) ListUsage(ctx context.Context, page, pageSize int, userID string, from, to *time.Time) ([]UsageEvent, httpx.Pagination, error) {
	items, total, err := s.store.ListUsage(ctx, page, pageSize, userID, from, to)
	if err != nil {
		return nil, httpx.Pagination{}, err
	}
	return items, httpx.Pagination{Page: page, PageSize: pageSize, Total: total}, nil
}