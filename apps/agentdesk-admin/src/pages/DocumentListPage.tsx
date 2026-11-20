import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircleIcon,
  EyeIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  LayersIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import {
  deleteDoc,
  fetchDocContentBlob,
  getDocStatusCounts,
  listDocChunks,
  listDocs,
  reprocessDoc,
  type DocChunk,
  type StatusCount,
} from '../api/docs'
import {
  fileKindLabel,
  statusLabel,
  type Document,
} from '../api/types'
import { UploadDialog } from '../components/UploadDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'

const PAGE_SIZE = 20

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ready':
      return 'default'
    case 'failed':
      return 'destructive'
    case 'processing':
    case 'pending':
      return 'secondary'
    default:
      return 'outline'
  }
}

function FileTypeIcon({ doc }: { doc: Document }) {
  const kind = fileKindLabel(doc.filename, doc.content_type)
  if (kind === '图片') return <FileImageIcon className="size-4 text-muted-foreground" />
  if (kind === 'PDF' || kind === 'Word' || kind === 'Markdown' || kind === '文本') {
    return <FileTextIcon className="size-4 text-muted-foreground" />
  }
  return <FileIcon className="size-4 text-muted-foreground" />
}

function formatTime(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function PreviewBody({
  doc,
  url,
  contentType,
}: {
  doc: Document
  url: string
  contentType: string
}) {
  if (contentType.startsWith('image/')) {
    return (
      <div className="flex max-h-[70vh] w-full items-center justify-center overflow-auto">
        <img
          src={url}
          alt={doc.filename}
          className="max-h-[70vh] w-auto max-w-full object-contain"
        />
      </div>
    )
  }
  if (contentType === 'application/pdf' || doc.filename.toLowerCase().endsWith('.pdf')) {
    return (
      <iframe
        title={doc.filename}
        src={url}
        className="h-[70vh] w-full rounded-md border"
      />
    )
  }
  if (
    contentType.startsWith('text/') ||
    doc.filename.toLowerCase().endsWith('.md') ||
    doc.filename.toLowerCase().endsWith('.txt')
  ) {
    return (
      <iframe
        title={doc.filename}
        src={url}
        className="h-[70vh] w-full rounded-md border bg-background"
      />
    )
  }
  return (
    <div className="flex flex-col gap-3 py-6 text-sm text-muted-foreground">
      <p>该格式暂不支持内嵌预览，请下载后查看。</p>
      <Button asChild variant="outline" size="sm" className="w-fit">
        <a href={url} download={doc.filename}>
          下载原文件
        </a>
      </Button>
    </div>
  )
}

export function DocumentListPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [listError, setListError] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    doc: Document
    url: string
    contentType: string
  } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([])
  const [chunksTarget, setChunksTarget] = useState<Document | null>(null)
  const [chunks, setChunks] = useState<DocChunk[]>([])
  const [chunksLoading, setChunksLoading] = useState(false)
  const [chunksError, setChunksError] = useState<string | null>(null)
  const fetchSeq = useRef(0)
  const previewUrlRef = useRef<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const refreshDocs = useCallback(async (p = page) => {
    const seq = ++fetchSeq.current
    setListLoading(true)
    setListError(null)
    try {
      const data = await listDocs(p, PAGE_SIZE, statusFilter)
      if (seq !== fetchSeq.current) return
      setDocs(data.items ?? [])
      setTotal(data.pagination?.total ?? 0)
      setPage(data.pagination?.page ?? p)
    } catch (err) {
      if (seq !== fetchSeq.current) return
      setListError(err instanceof Error ? err.message : '加载文档失败')
    } finally {
      if (seq === fetchSeq.current) setListLoading(false)
    }
  }, [page, statusFilter])

  const refreshCounts = useCallback(async () => {
    try {
      const res = await getDocStatusCounts()
      setStatusCounts(res.counts)
    } catch {
      // Status cards are non-critical; ignore failures.
    }
  }, [])

  useEffect(() => {
    void refreshDocs(page)
  }, [page, refreshDocs])

  useEffect(() => {
    void refreshCounts()
  }, [refreshCounts])

  const hasProcessing = docs.some(
    (d) => d.status === 'processing' || d.status === 'pending',
  )

  useEffect(() => {
    if (!hasProcessing) return
    const timer = window.setInterval(() => {
      void refreshDocs(page)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [hasProcessing, refreshDocs, page])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const openChunks = async (doc: Document) => {
    setChunksTarget(doc)
    setChunks([])
    setChunksError(null)
    setChunksLoading(true)
    try {
      const res = await listDocChunks(doc.id)
      setChunks(res.chunks)
    } catch (err) {
      setChunksError(err instanceof Error ? err.message : '加载知识片段失败')
    } finally {
      setChunksLoading(false)
    }
  }

  const openPreview = async (doc: Document) => {
    setPreviewError(null)
    setBusyId(doc.id)
    try {
      const { blob, contentType } = await fetchDocContentBlob(doc.id)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPreview({ doc, url, contentType })
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : '预览失败')
    } finally {
      setBusyId(null)
    }
  }

  const onReprocess = async (doc: Document) => {
    setBusyId(doc.id)
    setListError(null)
    try {
      await reprocessDoc(doc.id)
      await refreshDocs(page)
    } catch (err) {
      setListError(err instanceof Error ? err.message : '重试失败')
    } finally {
      setBusyId(null)
    }
  }

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setBusyId(id)
    setListError(null)
    try {
      await deleteDoc(id)
      setDeleteTarget(null)
      await refreshDocs(page)
    } catch (err) {
      setListError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">知识库文档</h2>
          <p className="text-sm text-muted-foreground">
            管理知识库文档与处理状态。共 {total} 条
            {hasProcessing ? ' · 正在处理，列表将自动刷新' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={listLoading}
            onClick={() => void refreshDocs(page)}
          >
            {listLoading ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            刷新
          </Button>
          <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
            <UploadIcon data-icon="inline-start" />
            上传文档
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { key: '', label: '全部', value: statusCounts.reduce((s, c) => s + c.count, 0) },
          { key: 'pending', label: '待处理', value: statusCounts.find((c) => c.status === 'pending')?.count ?? 0 },
          { key: 'processing', label: '处理中', value: statusCounts.find((c) => c.status === 'processing')?.count ?? 0 },
          { key: 'ready', label: '已入库', value: statusCounts.find((c) => c.status === 'ready')?.count ?? 0 },
          { key: 'failed', label: '处理失败', value: statusCounts.find((c) => c.status === 'failed')?.count ?? 0 },
        ].map((card) => (
          <button
            key={card.key || 'all'}
            type="button"
            onClick={() => { setStatusFilter(card.key); setPage(1) }}
            className="rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent"
            style={statusFilter === card.key ? { borderColor: 'var(--color-border-info)', background: 'var(--color-background-info)' } : undefined}
          >
            <p className="text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-xl font-medium">{card.value}</p>
          </button>
        ))}
      </div>

      {listError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{listError}</AlertDescription>
        </Alert>
      ) : null}

      {previewError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>预览失败</AlertTitle>
          <AlertDescription>{previewError}</AlertDescription>
        </Alert>
      ) : null}

      {docs.length === 0 && !listLoading ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed py-12 pl-6 text-sm text-muted-foreground">
          <p>暂无文档。上传后将自动解析并写入知识库。</p>
          <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
            <UploadIcon data-icon="inline-start" />
            上传文档
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[42%]">文件</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <FileTypeIcon doc={doc} />
                      <div className="min-w-0 flex flex-col gap-1">
                        <span className="truncate font-medium">{doc.filename}</span>
                        {doc.error_message ? (
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-destructive/5 px-2 py-1.5 font-mono text-[11px] leading-snug text-destructive">
                            {doc.error_message}
                          </pre>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fileKindLabel(doc.filename, doc.content_type)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(doc.status)}>
                      {statusLabel(doc.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatTime(doc.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyId === doc.id}
                        onClick={() => void openPreview(doc)}
                      >
                        {busyId === doc.id ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <EyeIcon data-icon="inline-start" />
                        )}
                        预览
                      </Button>
                      {doc.status === 'ready' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busyId === doc.id}
                          onClick={() => void openChunks(doc)}
                        >
                          <LayersIcon data-icon="inline-start" />
                          片段
                        </Button>
                      ) : null}
                      {doc.status === 'failed' || doc.status === 'ready' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busyId === doc.id}
                          onClick={() => void onReprocess(doc)}
                        >
                          <RotateCcwIcon data-icon="inline-start" />
                          重试
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyId === doc.id}
                        onClick={() => setDeleteTarget(doc)}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || listLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || listLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      ) : null}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => {
          setPage(1)
          void refreshDocs(1)
        }}
      />

      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) {
            setPreview(null)
            if (previewUrlRef.current) {
              URL.revokeObjectURL(previewUrlRef.current)
              previewUrlRef.current = null
            }
          }
        }}
      >
        <DialogContent className="max-w-4xl sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{preview?.doc.filename ?? '预览'}</DialogTitle>
            <DialogDescription>源文件预览（只读）</DialogDescription>
          </DialogHeader>
          {preview ? (
            <PreviewBody
              doc={preview.doc}
              url={preview.url}
              contentType={preview.contentType}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该文档？</AlertDialogTitle>
            <AlertDialogDescription>
              将从知识库下线「{deleteTarget?.filename}
              」，后续检索将不再命中。历史对话中的引用会保留快照，并标记为原文档已下架。此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onConfirmDelete()}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={chunksTarget !== null}
        onOpenChange={(open) => { if (!open) setChunksTarget(null) }}
      >
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>知识片段 · {chunksTarget?.filename}</DialogTitle>
            <DialogDescription>
              文档入库时切分并写入向量库的分块内容，可用于抽检检索语料质量。共 {chunks.length} 块。
            </DialogDescription>
          </DialogHeader>
          {chunksLoading ? (
            <div className="flex h-40 items-center justify-center"><Spinner /></div>
          ) : chunksError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{chunksError}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
              {chunks.map((c) => (
                <div key={c.id} className="rounded-md border p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    分块 #{c.chunk_index + 1}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.content}</p>
                </div>
              ))}
              {chunks.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">暂无分块内容</p>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}