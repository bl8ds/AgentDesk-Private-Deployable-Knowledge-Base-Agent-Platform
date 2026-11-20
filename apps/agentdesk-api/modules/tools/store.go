package tools

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// Row is one Agent tool definition, shared by agentdesk-api (admin CRUD) and
// agentdesk-agent (read-only, cached).
type Row struct {
	ID          string    `gorm:"primaryKey;column:id" json:"id"`
	Name        string    `gorm:"column:name" json:"name"`
	Label       string    `gorm:"column:label" json:"label"`
	Description string    `gorm:"column:description" json:"description"`
	Kind        string    `gorm:"column:kind" json:"kind"`
	Config      string    `gorm:"column:config" json:"config"`
	InputSchema string    `gorm:"column:input_schema" json:"input_schema"`
	Enabled     bool      `gorm:"column:enabled" json:"enabled"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Row) TableName() string { return "agent_tools" }

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) *Store { return &Store{db: db} }

func (s *Store) List(ctx context.Context, enabledOnly bool) ([]Row, error) {
	var items []Row
	q := s.db.WithContext(ctx).Order("kind ASC, name ASC")
	if enabledOnly {
		q = q.Where("enabled = ?", true)
	}
	if err := q.Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *Store) Get(ctx context.Context, id string) (*Row, error) {
	var row Row
	if err := s.db.WithContext(ctx).First(&row, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *Store) GetByName(ctx context.Context, name string) (*Row, error) {
	var row Row
	if err := s.db.WithContext(ctx).First(&row, "name = ?", name).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *Store) Create(ctx context.Context, row *Row) error {
	return s.db.WithContext(ctx).Create(row).Error
}

func (s *Store) Update(ctx context.Context, row *Row) error {
	row.UpdatedAt = time.Now().UTC()
	return s.db.WithContext(ctx).Save(row).Error
}

func (s *Store) Delete(ctx context.Context, id string) error {
	return s.db.WithContext(ctx).Where("id = ?", id).Delete(&Row{}).Error
}
