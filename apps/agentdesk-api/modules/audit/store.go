package audit

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Log struct {
	ID           uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	ActorID      string          `gorm:"column:actor_id" json:"actor_id"`
	Action       string          `json:"action"`
	ResourceType string          `gorm:"column:resource_type" json:"resource_type"`
	ResourceID   string          `gorm:"column:resource_id" json:"resource_id"`
	Meta         json.RawMessage `gorm:"type:jsonb" json:"meta"`
	CreatedAt    time.Time       `gorm:"column:created_at" json:"created_at"`
}

func (Log) TableName() string { return "audit_logs" }

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Create(ctx context.Context, log *Log) error {
	return s.db.WithContext(ctx).Create(log).Error
}

// ListFilter narrows audit log queries. Zero values mean "no filter".
type ListFilter struct {
	Action   string
	ActorID  string
	From     *time.Time
	To       *time.Time
}

// List returns a paginated, optionally filtered audit log page.
func (s *Store) List(ctx context.Context, page, pageSize int, f ListFilter) ([]Log, int64, error) {
	q := s.db.WithContext(ctx).Model(&Log{})
	if f.Action != "" {
		q = q.Where("action = ?", f.Action)
	}
	if f.ActorID != "" {
		q = q.Where("actor_id = ?", f.ActorID)
	}
	if f.From != nil {
		q = q.Where("created_at >= ?", *f.From)
	}
	if f.To != nil {
		q = q.Where("created_at <= ?", *f.To)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []Log
	err := q.Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&items).Error
	return items, total, err
}

// DistinctActions returns the action values present in the log, for filter dropdowns.
func (s *Store) DistinctActions(ctx context.Context) ([]string, error) {
	var actions []string
	err := s.db.WithContext(ctx).Model(&Log{}).
		Distinct().Order("action ASC").Pluck("action", &actions).Error
	return actions, err
}

func MetaJSON(v interface{}) json.RawMessage {
	if v == nil {
		return json.RawMessage(`{}`)
	}
	b, err := json.Marshal(v)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return b
}