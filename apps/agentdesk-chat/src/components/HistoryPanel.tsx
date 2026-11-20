import { useEffect, useMemo, useState } from 'react'
import { PencilIcon, XIcon } from 'lucide-react'
import { displayThreadTitle, type ChatThread } from '../api/threads'
import { useChatStore } from '../store/chat'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

function threadTime(t: ChatThread): number {
  return Date.parse(t.updatedAt || t.createdAt || '') || 0
}

/** Absolute clock — does not drift on re-render (unlike relative “n 分钟前”). */
function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type DayBucket = 'today' | 'yesterday' | 'week' | 'older'

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function dayBucket(iso?: string): DayBucket {
  const ts = Date.parse(iso || '')
  if (!Number.isFinite(ts) || ts <= 0) return 'older'
  const day = startOfLocalDay(new Date(ts))
  const today = startOfLocalDay(new Date())
  const diffDays = Math.round((today - day) / 86_400_000)
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return 'week'
  return 'older'
}

const BUCKET_LABEL: Record<DayBucket, string> = {
  today: '今天',
  yesterday: '昨天',
  week: '近 7 天',
  older: '更早',
}

const BUCKET_ORDER: DayBucket[] = ['today', 'yesterday', 'week', 'older']

function ThreadListBody({ onPick }: { onPick?: () => void }) {
  const threads = useChatStore((s) => s.threads)
  const loading = useChatStore((s) => s.threadsLoading)
  const error = useChatStore((s) => s.historyError)
  const conversationId = useChatStore((s) => s.conversationId)
  const openThread = useChatStore((s) => s.openThread)
  const renameThreadTitle = useChatStore((s) => s.renameThreadTitle)
  const sending = useChatStore((s) => s.sending)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState(false)

  const groups = useMemo(() => {
    const sorted = [...threads].sort((a, b) => threadTime(b) - threadTime(a))
    const map = new Map<DayBucket, ChatThread[]>()
    for (const t of sorted) {
      const key = dayBucket(t.updatedAt || t.createdAt)
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    }
    return BUCKET_ORDER.map((key) => ({
      key,
      label: BUCKET_LABEL[key],
      items: map.get(key) ?? [],
    })).filter((g) => g.items.length > 0)
  }, [threads])

  async function commitRename(threadId: string) {
    const next = draft.trim()
    if (!next) {
      setEditingId(null)
      return
    }
    setRenaming(true)
    try {
      await renameThreadTitle(threadId, next)
      setEditingId(null)
    } catch {
      /* keep editor open */
    } finally {
      setRenaming(false)
    }
  }

  return (
    <div className="hist-body">
      {loading ? <p className="muted hist-status">加载中…</p> : null}
      {error ? <p className="errorText hist-status">{error}</p> : null}
      {!loading && !error && threads.length === 0 ? (
        <p className="muted hist-status">暂无历史对话</p>
      ) : null}

      {groups.map((g) => (
        <div key={g.key} className="hist-group">
          <p className="hist-section">{g.label}</p>
          <ul className="hist-list">
            {g.items.map((t) => (
              <li key={t.id}>
                {editingId === t.id ? (
                  <form
                    className="hist-rename"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void commitRename(t.id)
                    }}
                  >
                    <input
                      className="hist-rename-input"
                      value={draft}
                      autoFocus
                      disabled={renaming}
                      maxLength={80}
                      aria-label="对话标题"
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => {
                        if (!renaming) void commitRename(t.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          setEditingId(null)
                        }
                      }}
                    />
                  </form>
                ) : (
                  <div
                    className={cn(
                      'hist-row',
                      t.id === conversationId && 'hist-row-active',
                    )}
                  >
                    <button
                      type="button"
                      className="hist-item"
                      disabled={sending}
                      onClick={() => {
                        void openThread(t.id)
                        onPick?.()
                      }}
                    >
                      <span className="hist-title">{displayThreadTitle(t.title)}</span>
                      <span className="hist-meta">
                        {formatTime(t.updatedAt || t.createdAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="hist-rename-btn"
                      aria-label="重命名"
                      disabled={sending || renaming}
                      onClick={() => {
                        setEditingId(t.id)
                        setDraft(displayThreadTitle(t.title))
                      }}
                    >
                      <PencilIcon />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** History panel from the right. */
export function HistorySheet({ embedded }: { embedded?: boolean }) {
  void embedded
  const open = useChatStore((s) => s.historyOpen)
  const setHistoryOpen = useChatStore((s) => s.setHistoryOpen)
  const refreshThreads = useChatStore((s) => s.refreshThreads)

  useEffect(() => {
    if (open) void refreshThreads()
  }, [open, refreshThreads])

  return (
    <Sheet open={open} onOpenChange={setHistoryOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="hist-sheet w-[min(86vw,20rem)] gap-0 border-0 border-l-0 bg-[var(--sidebar-bg)] p-0 shadow-none sm:max-w-sm"
      >
        <SheetHeader className="hist-sheet-header space-y-0">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-foreground">历史对话</SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="关闭"
              onClick={() => setHistoryOpen(false)}
            >
              <XIcon />
            </Button>
          </div>
          <SheetDescription className="sr-only">历史对话列表</SheetDescription>
        </SheetHeader>
        <ThreadListBody onPick={() => setHistoryOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}