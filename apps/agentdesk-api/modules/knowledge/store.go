package knowledge

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	StatusPending    = "pending"
	StatusProcessing = "processing"
	StatusReady      = "ready"
	StatusFailed     = "failed"
	StatusDeleted    = "deleted"
)

type Document struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Filename     string    `json:"filename"`
	ContentType  string    `gorm:"column:content_type" json:"content_type"`
	ContentHash  string    `gorm:"column:content_hash" json:"content_hash,omitempty"`
	StoragePath  string    `gorm:"column:storage_path" json:"-"` // S3 object key, e.g. docs/{uuid}.pdf
	Status       string    `json:"status"`
	ErrorMessage string    `gorm:"column:error_message" json:"error_message,omitempty"`
	UploadedBy   string    `gorm:"column:uploaded_by" json:"uploaded_by"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Document) TableName() string { return "documents" }

type Chunk struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	DocumentID uuid.UUID `gorm:"column:document_id;type:uuid" json:"document_id"`
	ChunkIndex int       `gorm:"column:chunk_index" json:"chunk_index"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `gorm:"column:created_at" json:"created_at"`
}

func (Chunk) TableName() string { return "document_chunks" }

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) *Store {
	return &Store{db: db}
}

func (s *Store) CreateDocument(ctx context.Context, doc *Document) error {
	return s.db.WithContext(ctx).Create(doc).Error
}

func (s *Store) UpdateDocument(ctx context.Context, doc *Document) error {
	doc.UpdatedAt = time.Now().UTC()
	return s.db.WithContext(ctx).Save(doc).Error
}

func (s *Store) GetDocument(ctx context.Context, id uuid.UUID) (*Document, error) {
	var doc Document
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&doc).Error; err != nil {
		return nil, err
	}
	return &doc, nil
}

func (s *Store) FindActiveByContentHash(ctx context.Context, hash string) (*Document, error) {
	if hash == "" {
		return nil, gorm.ErrRecordNotFound
	}
	var doc Document
	err := s.db.WithContext(ctx).
		Where("content_hash = ? AND status IN ?", hash, []string{StatusPending, StatusProcessing, StatusReady}).
		Order("created_at DESC").
		First(&doc).Error
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (s *Store) ListDocuments(ctx context.Context, page, pageSize int) ([]Document, int64, error) {
	var total int64
	q := s.db.WithContext(ctx).Model(&Document{}).Where("status <> ?", StatusDeleted)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []Document
	err := q.Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&items).Error
	return items, total, err
}

// ListDocumentsFiltered is ListDocuments plus an optional status filter.
func (s *Store) ListDocumentsFiltered(ctx context.Context, page, pageSize int, status string) ([]Document, int64, error) {
	q := s.db.WithContext(ctx).Model(&Document{}).Where("status <> ?", StatusDeleted)
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []Document
	err := q.Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&items).Error
	return items, total, err
}

// DocumentStatusCount is a per-status count for the processing monitor cards.
type DocumentStatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

// CountByStatus returns document counts grouped by status (excluding deleted).
func (s *Store) CountByStatus(ctx context.Context) ([]DocumentStatusCount, error) {
	var rows []DocumentStatusCount
	err := s.db.WithContext(ctx).Model(&Document{}).
		Select("status, COUNT(*) as count").
		Where("status <> ?", StatusDeleted).
		Group("status").Scan(&rows).Error
	return rows, err
}

// ListChunks returns the chunks of a document in index order (for corpus inspection).
func (s *Store) ListChunks(ctx context.Context, documentID uuid.UUID) ([]Chunk, error) {
	var items []Chunk
	err := s.db.WithContext(ctx).
		Where("document_id = ?", documentID).
		Order("chunk_index ASC").Find(&items).Error
	return items, err
}

func (s *Store) DeleteChunks(ctx context.Context, documentID uuid.UUID) error {
	return s.db.WithContext(ctx).Where("document_id = ?", documentID).Delete(&Chunk{}).Error
}

func (s *Store) ReplaceChunks(ctx context.Context, documentID uuid.UUID, chunks []Chunk) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("document_id = ?", documentID).Delete(&Chunk{}).Error; err != nil {
			return err
		}
		if len(chunks) == 0 {
			return nil
		}
		return tx.Create(&chunks).Error
	})
}