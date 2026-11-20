import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { XIcon } from 'lucide-react'
import { apiFetchBlob } from '../api/client'
import {
  looksLikeImageCitation,
  looksLikeVideoCitation,
  type Citation,
} from '../api/types'
import { useChatStore, type ChatMessage } from '../store/chat'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'

const EMPTY_CITATIONS: Citation[] = []

type CitationView = Citation & {
  /** 1-based index matching `[#n]` in model output */
  index: number
}

const CitationListContext = createContext<CitationView[]>([])

/** Same resolution as the first working version, plus streamCitations. */
export function pickCitations(
  messages: ChatMessage[] | undefined,
  messageId: string | null | undefined,
  streamCitations: Citation[] | undefined,
): Citation[] {
  const msgs = messages ?? []
  const stream = streamCitations ?? EMPTY_CITATIONS
  if (messageId) {
    const exact = msgs.find((m) => m.id === messageId)
    if (exact?.citations?.length) return exact.citations
  }
  if (stream.length) return stream
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.role === 'assistant' && (m.citations?.length ?? 0) > 0) {
      return m.citations ?? EMPTY_CITATIONS
    }
  }
  return EMPTY_CITATIONS
}

export function CitationProvider({
  citations,
  children,
}: {
  citations?: Citation[] | null
  children: ReactNode
}) {
  const list = useMemo<CitationView[]>(() => {
    const src = Array.isArray(citations) ? citations : EMPTY_CITATIONS
    return src.map((c, i) => ({
      ...c,
      index: i + 1,
      snippet: c?.snippet?.trim() || undefined,
    }))
  }, [citations])
  return (
    <CitationListContext.Provider value={list}>{children}</CitationListContext.Provider>
  )
}

/**
 * Normalize common citation marks to `[#n]` then to markdown links for CitationSup.
 * Keeps transforms conservative to avoid false positives on bare numbers.
 */
export function preprocessCitationMarks(text: string): string {
  return text
    .replace(/[(\uFF08]\s*((?:\[#\d+\]\s*)+)[)\uFF09]/g, '$1')
    .replace(/【\s*((?:\[#\d+\]\s*)+)】/g, '$1')
    .replace(
      /(?:文档|片段|资料|引用|snippet|cite)\s*[#:]?\s*(\d+)/gi,
      '[#$1]',
    )
    .replace(/\[#(\d+)\]/g, '[$1](#agentdesk-cite-$1)')
}

export function isCitationHref(href?: string | null): number | null {
  if (!href) return null
  const m = href.match(/#agentdesk-cite-(\d+)(?:[?#].*)?$/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Superscript → bottom sheet with「资料 n」+ snippet (+ image when applicable).
 */
export function CitationSup({ index }: { index: number }) {
  const list = useContext(CitationListContext)
  const fromCtx = list.find((c) => c.index === index)
  const fromStore = useChatStore((s) => {
    const cites = pickCitations(s.messages, null, s.streamCitations)
    return cites[index - 1]
  })
  const cite: CitationView = {
    index,
    document_id: fromCtx?.document_id || fromStore?.document_id,
    filename: fromCtx?.filename || fromStore?.filename,
    content_type: fromCtx?.content_type || fromStore?.content_type,
    snippet: (fromCtx?.snippet || fromStore?.snippet || '').trim() || undefined,
    source_status:
      fromCtx?.source_status === 'withdrawn' ||
      fromStore?.source_status === 'withdrawn'
        ? 'withdrawn'
        : 'active',
  }

  const [open, setOpen] = useState(false)

  return (
    <span className="cite-wrap">
      <button
        type="button"
        className={open ? 'cite-sup cite-sup-on' : 'cite-sup'}
        aria-expanded={open}
        aria-label={`查看资料 ${index}`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {index}
      </button>
      <CitationDrawer open={open} onOpenChange={setOpen} cite={cite} />
    </span>
  )
}

function cleanSnippetText(raw?: string): string {
  if (!raw?.trim()) return ''
  let s = raw.trim()
  // Drop fenced code blocks' markers but keep inner text when useful.
  s = s.replace(/```[\w+-]*\n?/g, '').replace(/```/g, '')
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
  s = s.replace(/\s+/g, ' ').trim()
  // Mostly markup residue → treat as empty.
  if (/^(html|body|div|span|img|p|br)\b/i.test(s) && s.length < 40) return ''
  return s
}

/** Session cache: avoid re-downloading the same source blob. */
const previewUrlCache = new Map<string, { url: string; contentType: string }>()

/** Save/open without relying on target=_blank (WebView-hostile). */
function saveOrOpenBlob(
  blob: Blob,
  contentType: string,
  filename?: string,
): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener noreferrer'
  const inline =
    contentType.startsWith('image/') ||
    contentType.startsWith('video/') ||
    contentType === 'application/pdf' ||
    contentType.startsWith('text/')
  // Prefer download in embedded WebViews; browsers still open PDFs/text when possible.
  a.download = filename || (inline ? 'source' : 'source.bin')
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function CitationDrawer({
  open,
  onOpenChange,
  cite,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  cite: CitationView
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const wantImage = looksLikeImageCitation(cite)
  const wantVideo = looksLikeVideoCitation(cite)
  const wantMedia = wantImage || wantVideo
  const cleanedSnippet = useMemo(
    () => cleanSnippetText(cite.snippet),
    [cite.snippet],
  )

  useEffect(() => {
    if (!open) setLightbox(false)
  }, [open])

  useEffect(() => {
    if (!open || !wantMedia || !cite.document_id) {
      setPreviewUrl(null)
      setPreviewType(null)
      setPreviewLoading(false)
      setPreviewError(null)
      return
    }

    const docId = cite.document_id
    const cached = previewUrlCache.get(docId)
    if (cached) {
      setPreviewUrl(cached.url)
      setPreviewType(cached.contentType)
      setPreviewLoading(false)
      setPreviewError(null)
      return
    }

    let cancelled = false
    setPreviewUrl(null)
    setPreviewType(null)
    setPreviewLoading(true)
    setPreviewError(null)

    void apiFetchBlob(`/api/v1/chat/sources/${docId}/content`)
      .then(({ blob, contentType }) => {
        if (cancelled) return
        const ok =
          contentType.startsWith('image/') || contentType.startsWith('video/')
        if (!ok) {
          setPreviewLoading(false)
          return
        }
        const url = URL.createObjectURL(blob)
        previewUrlCache.set(docId, { url, contentType })
        setPreviewUrl(url)
        setPreviewType(contentType)
        setPreviewLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPreviewLoading(false)
        setPreviewError(err instanceof Error ? err.message : '媒体加载失败')
      })

    return () => {
      cancelled = true
    }
  }, [open, wantMedia, cite.document_id])

  const withdrawn = cite.source_status === 'withdrawn'
  // Media is the primary exhibit; OCR dump often contains HTML noise — only
  // show cleaned text when there is no usable preview.
  const showSnippet =
    Boolean(cleanedSnippet) && !(wantMedia && (previewUrl || previewLoading))

  const downloadSource = () => {
    if (!cite.document_id) return
    void apiFetchBlob(`/api/v1/chat/sources/${cite.document_id}/content`)
      .then(({ blob, contentType }) => {
        saveOrOpenBlob(blob, contentType, cite.filename)
      })
      .catch(() => {
        /* ignore */
      })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="cite-sheet"
      >
        <div className="cite-sheet-handle" aria-hidden />
        <SheetHeader className="cite-sheet-header">
          <div className="cite-sheet-title-row">
            <SheetTitle className="cite-sheet-title">
              资料 {cite.index}
              {withdrawn ? (
                <span className="cite-sheet-badge">已下架</span>
              ) : null}
            </SheetTitle>
            <button
              type="button"
              className="cite-sheet-close"
              aria-label="关闭"
              onClick={() => onOpenChange(false)}
            >
              <XIcon aria-hidden />
            </button>
          </div>
          <SheetDescription className="cite-sheet-file">
            {cite.filename || '知识库片段'}
          </SheetDescription>
        </SheetHeader>

        <div className="cite-sheet-body">
          {wantMedia && previewLoading ? (
            <div className="cite-sheet-media-skel" aria-busy>
              <div className="cite-sheet-skel" />
              <p className="cite-sheet-hint">
                {wantVideo ? '视频加载中…' : '图片加载中…'}
              </p>
            </div>
          ) : null}
          {previewUrl && previewType?.startsWith('image/') ? (
            <button
              type="button"
              className="cite-sheet-media"
              onClick={() => setLightbox(true)}
              aria-label="放大查看"
            >
              <img
                src={previewUrl}
                alt={cite.filename || `资料 ${cite.index}`}
              />
              <span className="cite-sheet-open-hint">点击放大</span>
            </button>
          ) : null}
          {previewUrl && previewType?.startsWith('video/') ? (
            <div className="cite-sheet-media">
              <video
                src={previewUrl}
                controls
                playsInline
                preload="metadata"
                aria-label={cite.filename || `资料 ${cite.index}`}
              />
            </div>
          ) : null}
          {previewError ? (
            <p className="cite-sheet-hint">{previewError}</p>
          ) : null}
          {cite.document_id && !wantMedia ? (
            <button
              type="button"
              className="cite-sheet-open-file"
              onClick={downloadSource}
            >
              打开原文件
            </button>
          ) : null}
          {cite.document_id && wantMedia && !previewUrl && !previewLoading ? (
            <button
              type="button"
              className="cite-sheet-open-file"
              onClick={downloadSource}
            >
              打开原文件
            </button>
          ) : null}
          {showSnippet ? (
            <p className="cite-sheet-snippet">{cleanedSnippet}</p>
          ) : null}
          {!wantMedia && !cleanedSnippet ? (
            <p className="cite-sheet-hint">暂无摘要</p>
          ) : null}
        </div>

        {lightbox && previewUrl ? (
          <div
            className="cite-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="图片预览"
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              className="cite-lightbox-close"
              aria-label="关闭预览"
              onClick={() => setLightbox(false)}
            >
              <XIcon aria-hidden />
            </button>
            <img
              src={previewUrl}
              alt={cite.filename || `资料 ${cite.index}`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}