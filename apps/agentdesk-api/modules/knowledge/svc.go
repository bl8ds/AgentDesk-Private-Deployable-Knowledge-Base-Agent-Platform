package knowledge

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/ledongthuc/pdf"
	"gorm.io/gorm"

	"agentdesk.example/api/internal/storage"
	"agentdesk.example/api/modules/agent"
	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

const (
	chunkSize    = 400
	chunkOverlap = 50
)

type Service struct {
	store *Store
	s3    *storage.S3
	agent *agent.Client
	// Serialize extract+ingest: concurrent uploads otherwise stampede the
	// embedding API and trip the agent HTTP client timeout on prod.
	processMu sync.Mutex
}

func NewService(store *Store, s3 *storage.S3, agentClient *agent.Client) *Service {
	return &Service{
		store: store,
		s3:    s3,
		agent: agentClient,
	}
}

func isImageExt(ext string) bool {
	switch strings.ToLower(ext) {
	case ".png", ".jpg", ".jpeg", ".webp", ".gif":
		return true
	default:
		return false
	}
}

func (s *Service) Upload(ctx context.Context, filename, contentType, uploadedBy string, r io.Reader) (*Document, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	switch {
	case ext == ".pdf", ext == ".txt", ext == ".md", ext == ".docx", isImageExt(ext):
	default:
		return nil, apperr.Validation("unsupported_type", "only pdf, docx, txt, md, and images (png/jpg/webp/gif) are supported")
	}

	data, err := io.ReadAll(r)
	if err != nil {
		return nil, apperr.Internal("read upload", err)
	}

	sum := sha256.Sum256(data)
	contentHash := hex.EncodeToString(sum[:])
	if existing, err := s.store.FindActiveByContentHash(ctx, contentHash); err == nil && existing != nil {
		return existing, nil
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, apperr.Internal("lookup content hash", err)
	}

	id := uuid.New()
	key := "docs/" + id.String() + ext
	if err := s.s3.PutObject(ctx, key, bytes.NewReader(data), contentType); err != nil {
		return nil, apperr.Internal("s3 put object", err)
	}

	doc := &Document{
		ID:          id,
		Filename:    filename,
		ContentType: contentType,
		ContentHash: contentHash,
		StoragePath: key,
		Status:      StatusPending,
		UploadedBy:  uploadedBy,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	if err := s.store.CreateDocument(ctx, doc); err != nil {
		return nil, apperr.Internal("create document", err)
	}

	go s.processAsync(id)
	return doc, nil
}

func (s *Service) processAsync(id uuid.UUID) {
	s.processMu.Lock()
	defer s.processMu.Unlock()

	ctx := context.Background()
	doc, err := s.store.GetDocument(ctx, id)
	if err != nil {
		return
	}
	doc.Status = StatusProcessing
	_ = s.store.UpdateDocument(ctx, doc)

	text, err := s.extractFromS3(ctx, doc.StoragePath, filepath.Ext(doc.Filename))
	if err != nil || strings.TrimSpace(text) == "" {
		doc.Status = StatusFailed
		if err != nil {
			doc.ErrorMessage = err.Error()
		} else {
			doc.ErrorMessage = "no text extracted (empty or scanned PDF)"
		}
		_ = s.store.UpdateDocument(ctx, doc)
		return
	}

	parts := splitChunks(text, chunkSize, chunkOverlap)
	chunks := make([]Chunk, 0, len(parts))
	agentChunks := make([]agent.IngestChunk, 0, len(parts))
	now := time.Now().UTC()
	for i, p := range parts {
		chunks = append(chunks, Chunk{
			ID:         uuid.New(),
			DocumentID: doc.ID,
			ChunkIndex: i,
			Content:    p,
			CreatedAt:  now,
		})
		agentChunks = append(agentChunks, agent.IngestChunk{Index: i, Content: p})
	}
	if err := s.store.ReplaceChunks(ctx, doc.ID, chunks); err != nil {
		doc.Status = StatusFailed
		doc.ErrorMessage = err.Error()
		_ = s.store.UpdateDocument(ctx, doc)
		return
	}

	if s.agent != nil {
		if err := s.agent.Ingest(ctx, doc.ID.String(), doc.Filename, doc.ContentType, agentChunks); err != nil {
			doc.Status = StatusFailed
			doc.ErrorMessage = "agent ingest: " + err.Error()
			_ = s.store.UpdateDocument(ctx, doc)
			return
		}
	}

	doc.Status = StatusReady
	doc.ErrorMessage = ""
	_ = s.store.UpdateDocument(ctx, doc)
}

func (s *Service) extractFromS3(ctx context.Context, key, ext string) (string, error) {
	body, err := s.s3.GetObject(ctx, key)
	if err != nil {
		return "", err
	}
	defer body.Close()

	data, err := io.ReadAll(body)
	if err != nil {
		return "", err
	}
	ext = strings.ToLower(ext)
	if isImageExt(ext) {
		if s.agent == nil {
			return "", apperr.Internal("vision unavailable", nil)
		}
		ct := "image/jpeg"
		switch ext {
		case ".png":
			ct = "image/png"
		case ".webp":
			ct = "image/webp"
		case ".gif":
			ct = "image/gif"
		case ".jpg", ".jpeg":
			ct = "image/jpeg"
		}
		return s.agent.VisionExtract(ctx, ct, data)
	}
	return extractTextBytes(data, ext)
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (*Document, error) {
	doc, err := s.store.GetDocument(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.NotFound("document_not_found", "document not found")
		}
		return nil, apperr.Internal("get document", err)
	}
	return doc, nil
}

func (s *Service) List(ctx context.Context, page, pageSize int) ([]Document, httpx.Pagination, error) {
	return s.ListFiltered(ctx, page, pageSize, "")
}

// ListFiltered supports an optional status filter for the processing monitor.
func (s *Service) ListFiltered(ctx context.Context, page, pageSize int, status string) ([]Document, httpx.Pagination, error) {
	items, total, err := s.store.ListDocumentsFiltered(ctx, page, pageSize, status)
	if err != nil {
		return nil, httpx.Pagination{}, apperr.Internal("list documents", err)
	}
	return items, httpx.Pagination{Page: page, PageSize: pageSize, Total: total}, nil
}

// StatusCounts returns document counts grouped by status for monitor cards.
func (s *Service) StatusCounts(ctx context.Context) ([]DocumentStatusCount, error) {
	rows, err := s.store.CountByStatus(ctx)
	if err != nil {
		return nil, apperr.Internal("count document status", err)
	}
	return rows, nil
}

// Chunks returns a document's stored chunks in index order for corpus inspection.
func (s *Service) Chunks(ctx context.Context, documentID uuid.UUID) ([]Chunk, error) {
	if _, err := s.store.GetDocument(ctx, documentID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.NotFound("document_not_found", "document not found")
		}
		return nil, apperr.Internal("get document", err)
	}
	chunks, err := s.store.ListChunks(ctx, documentID)
	if err != nil {
		return nil, apperr.Internal("list chunks", err)
	}
	return chunks, nil
}

// Delete soft-deletes the document, removes chunks + vectors, and deletes the object.
// Chat history citations keep their frozen snapshot; retrieval will no longer hit this doc.
func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	doc, err := s.store.GetDocument(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.NotFound("document_not_found", "document not found")
		}
		return apperr.Internal("get document", err)
	}
	if doc.Status == StatusDeleted {
		return nil
	}
	_ = s.store.DeleteChunks(ctx, id)
	if s.agent != nil {
		_ = s.agent.Unindex(ctx, id.String())
	}
	if s.s3 != nil && doc.StoragePath != "" {
		_ = s.s3.DeleteObject(ctx, doc.StoragePath)
	}
	doc.Status = StatusDeleted
	doc.ErrorMessage = ""
	doc.StoragePath = ""
	if err := s.store.UpdateDocument(ctx, doc); err != nil {
		return apperr.Internal("soft delete document", err)
	}
	return nil
}

// Reprocess re-runs extraction + ingest for failed/ready documents.
func (s *Service) Reprocess(ctx context.Context, id uuid.UUID) (*Document, error) {
	doc, err := s.store.GetDocument(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.NotFound("document_not_found", "document not found")
		}
		return nil, apperr.Internal("get document", err)
	}
	if doc.Status == StatusDeleted {
		return nil, apperr.Validation("document_deleted", "deleted documents cannot be reprocessed")
	}
	if doc.Status == StatusProcessing || doc.Status == StatusPending {
		return nil, apperr.Validation("document_busy", "document is already being processed")
	}
	if doc.StoragePath == "" {
		return nil, apperr.Validation("missing_file", "source file is no longer available")
	}
	doc.Status = StatusPending
	doc.ErrorMessage = ""
	if err := s.store.UpdateDocument(ctx, doc); err != nil {
		return nil, apperr.Internal("reset document", err)
	}
	go s.processAsync(id)
	return doc, nil
}

// OpenContent returns the stored object for in-browser preview.
func (s *Service) OpenContent(ctx context.Context, id uuid.UUID) (*Document, io.ReadCloser, error) {
	doc, err := s.store.GetDocument(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, apperr.NotFound("document_not_found", "document not found")
		}
		return nil, nil, apperr.Internal("get document", err)
	}
	if doc.Status == StatusDeleted || doc.StoragePath == "" {
		return nil, nil, apperr.NotFound("file_gone", "source file is no longer available")
	}
	body, err := s.s3.GetObject(ctx, doc.StoragePath)
	if err != nil {
		return nil, nil, apperr.Internal("open content", err)
	}
	return doc, body, nil
}

// OpenContentMeta is the chat-facing preview adapter (filename + content type + body).
func (s *Service) OpenContentMeta(ctx context.Context, id uuid.UUID) (filename string, contentType string, body io.ReadCloser, err error) {
	doc, rc, err := s.OpenContent(ctx, id)
	if err != nil {
		return "", "", nil, err
	}
	return doc.Filename, doc.ContentType, rc, nil
}

func extractTextBytes(data []byte, ext string) (string, error) {
	ext = strings.ToLower(ext)
	switch ext {
	case ".txt", ".md":
		if !utf8.Valid(data) {
			return string(data), nil
		}
		return string(data), nil
	case ".docx":
		return extractDocx(data)
	case ".pdf":
		tmp, err := os.CreateTemp("", "agentdesk-doc-*.pdf")
		if err != nil {
			return "", err
		}
		tmpPath := tmp.Name()
		defer os.Remove(tmpPath)
		if _, err := tmp.Write(data); err != nil {
			_ = tmp.Close()
			return "", err
		}
		if err := tmp.Close(); err != nil {
			return "", err
		}
		f, r, err := pdf.Open(tmpPath)
		if err != nil {
			return "", err
		}
		defer f.Close()
		var buf bytes.Buffer
		b, err := r.GetPlainText()
		if err != nil {
			return "", err
		}
		if _, err := buf.ReadFrom(b); err != nil {
			return "", err
		}
		return buf.String(), nil
	default:
		return "", apperr.Validation("unsupported_type", "unsupported extension")
	}
}

func splitChunks(text string, size, overlap int) []string {
	runes := []rune(strings.TrimSpace(text))
	if len(runes) == 0 {
		return nil
	}
	if size < 1 {
		size = 400
	}
	if overlap < 0 || overlap >= size {
		overlap = size / 10
	}
	var out []string
	for start := 0; start < len(runes); {
		end := start + size
		if end > len(runes) {
			end = len(runes)
		}
		out = append(out, string(runes[start:end]))
		if end == len(runes) {
			break
		}
		start = end - overlap
	}
	return out
}