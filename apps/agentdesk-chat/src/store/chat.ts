import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { streamChat } from '../api/chat'
import {
  extractMessageText,
  getThreadMessages,
  isPlaceholderTitle,
  listThreads,
  renameThread,
  titleFromUserText,
  type ChatThread,
} from '../api/threads'
import type { Citation } from '../api/types'

export type Role = 'user' | 'assistant' | 'error'

export type ToolActivity = {
  name: string
  args?: unknown
  result?: unknown
  status: 'running' | 'done' | 'error'
  call_id?: string
}

export type ChatMessage = {
  id: string
  role: Role
  content: string
  reasoning?: string
  citations?: Citation[]
  toolActivities?: ToolActivity[]
}

type ChatState = {
  messages: ChatMessage[]
  sending: boolean
  conversationId: string | null
  threads: ChatThread[]
  /** Local / pending titles until server catches up. */
  titleOverrides: Record<string, string>
  /** Citations for the in-flight / latest turn (side channel for drawers). */
  streamCitations: Citation[]
  /** retrieving | reasoning | answering — UX placeholder while waiting. */
  streamPhase: string | null
  threadsLoading: boolean
  historyOpen: boolean
  historyError: string | null
  lastUsage: {
    total_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
    reasoning_tokens?: number
    model?: string
  } | null
  setHistoryOpen: (v: boolean) => void
  clear: () => void
  refreshThreads: () => Promise<void>
  openThread: (threadId: string) => Promise<void>
  renameThreadTitle: (threadId: string, title: string) => Promise<void>
  send: (text: string) => Promise<void>
  cancelSend: () => void
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function mapRole(role?: string): Role | null {
  const r = (role || '').toLowerCase()
  if (r === 'user' || r === 'human') return 'user'
  if (r === 'assistant' || r === 'ai' || r === 'model' || r === 'bot') {
    return 'assistant'
  }
  if (r === 'error') return 'error'
  return null
}

function mergeThreadTitles(
  remote: ChatThread[],
  overrides: Record<string, string>,
  local: ChatThread[],
): ChatThread[] {
  const remoteMerged = remote.map((t) => {
    const override = overrides[t.id]?.trim()
    const remoteOk = !isPlaceholderTitle(t.title)
    if (remoteOk) return { ...t, title: t.title.trim() }
    if (override) return { ...t, title: override }
    return { ...t, title: '' }
  })

  // Keep optimistic local threads until the server lists them (avoids "lost latest").
  const remoteIds = new Set(remoteMerged.map((t) => t.id))
  const orphans = local.filter((t) => t.id && !remoteIds.has(t.id))
  return [...orphans, ...remoteMerged]
}

function rememberTitle(
  overrides: Record<string, string>,
  threadId: string,
  title: string,
): Record<string, string> {
  const t = title.trim()
  if (!t || isPlaceholderTitle(t)) return overrides
  return { ...overrides, [threadId]: t }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      let activeAbort: AbortController | null = null
      let stallTimer: number | null = null

      const clearStallTimer = () => {
        if (stallTimer != null) {
          window.clearTimeout(stallTimer)
          stallTimer = null
        }
      }

      const armStallTimer = (assistantId: string) => {
        clearStallTimer()
        stallTimer = window.setTimeout(() => {
          const m = get().messages.find((x) => x.id === assistantId)
          if (!m || m.content.trim() || (m.reasoning || '').trim()) return
          activeAbort?.abort()
          set((s) => ({
            sending: false,
            streamPhase: null,
            messages: s.messages.map((row) =>
              row.id === assistantId
                ? {
                    ...row,
                    role: 'error',
                    content: '响应超时，请重试',
                  }
                : row,
            ),
          }))
        }, 90_000)
      }

      return {
      messages: [],
      sending: false,
      conversationId: null,
      threads: [],
      titleOverrides: {},
      streamCitations: [],
      streamPhase: null,
      threadsLoading: false,
      historyOpen: false,
      historyError: null,
      lastUsage: null,
      setHistoryOpen: (v) => {
        set({ historyOpen: v })
        if (v) void get().refreshThreads()
      },
      clear: () => {
        activeAbort?.abort()
        activeAbort = null
        clearStallTimer()
        set({
          messages: [],
          sending: false,
          conversationId: null,
          lastUsage: null,
          streamCitations: [],
          streamPhase: null,
        })
      },
      cancelSend: () => {
        activeAbort?.abort()
        activeAbort = null
        clearStallTimer()
        set({ sending: false, streamPhase: null })
      },
      refreshThreads: async () => {
        set({ threadsLoading: true, historyError: null })
        try {
          const remote = await listThreads()
          remote.sort((a, b) => {
            const ta = Date.parse(a.updatedAt || a.createdAt || '') || 0
            const tb = Date.parse(b.updatedAt || b.createdAt || '') || 0
            return tb - ta
          })
          const { titleOverrides, threads: local } = get()
          const threads = mergeThreadTitles(remote, titleOverrides, local)
          threads.sort((a, b) => {
            const ta = Date.parse(a.updatedAt || a.createdAt || '') || 0
            const tb = Date.parse(b.updatedAt || b.createdAt || '') || 0
            return tb - ta
          })
          // Drop overrides once server has a real title.
          const nextOverrides = { ...titleOverrides }
          for (const t of remote) {
            if (!isPlaceholderTitle(t.title) && nextOverrides[t.id]) {
              delete nextOverrides[t.id]
            }
          }
          set({ threads, titleOverrides: nextOverrides })
        } catch (err) {
          set({
            historyError: err instanceof Error ? err.message : '加载历史失败',
          })
        } finally {
          set({ threadsLoading: false })
        }
      },
      openThread: async (threadId: string) => {
        set({ historyError: null, threadsLoading: true })
        try {
          const { messages: raw, citationTurns } = await getThreadMessages(threadId)
          const messages: ChatMessage[] = []
          let assistantTurn = 0
          for (const m of raw) {
            const role = mapRole(m.role)
            if (!role || role === 'error') continue
            const { text, reasoning } = extractMessageText(m.content)
            if (!text.trim() && !reasoning?.trim()) continue
            if (role === 'user') {
              messages.push({
                id: m.id || uid(),
                role,
                content: text,
              })
            } else {
              const cites = citationTurns[assistantTurn] ?? []
              assistantTurn += 1
              messages.push({
                id: m.id || uid(),
                role,
                content: text,
                reasoning,
                citations: cites.length ? cites : undefined,
              })
            }
          }

          const firstUser = messages.find((m) => m.role === 'user')
          const serverTitle = get().threads.find((t) => t.id === threadId)?.title
          const needsFirstTitle =
            Boolean(firstUser) && isPlaceholderTitle(serverTitle)
          const smart = needsFirstTitle
            ? titleFromUserText(firstUser!.content)
            : ''

          set((s) => {
            let titleOverrides = s.titleOverrides
            let threads = s.threads
            if (smart) {
              titleOverrides = rememberTitle(titleOverrides, threadId, smart)
              threads = threads.map((t) =>
                t.id === threadId && isPlaceholderTitle(t.title)
                  ? { ...t, title: smart }
                  : t,
              )
            }
            return {
              messages,
              conversationId: threadId,
              historyOpen: false,
              lastUsage: null,
              streamCitations: [],
              threads,
              titleOverrides,
            }
          })

          // First-time only: server still has placeholder → PATCH once, then never again.
          if (smart) {
            void renameThread(threadId, smart).catch(() => {
              /* best-effort */
            })
          }
        } catch (err) {
          set({
            historyError: err instanceof Error ? err.message : '打开对话失败',
          })
        } finally {
          set({ threadsLoading: false })
        }
      },
      renameThreadTitle: async (threadId: string, title: string) => {
        const next = title.trim().slice(0, 80)
        if (!next) throw new Error('标题不能为空')
        await renameThread(threadId, next)
        set((s) => ({
          titleOverrides: rememberTitle(s.titleOverrides, threadId, next),
          threads: s.threads.map((t) =>
            t.id === threadId ? { ...t, title: next } : t,
          ),
        }))
      },
      send: async (text: string) => {
        const trimmed = text.trim()
        const { sending, conversationId } = get()
        if (!trimmed || sending) return

        const isNewThread = !conversationId
        const provisionalTitle = titleFromUserText(trimmed)

        activeAbort?.abort()
        const ac = new AbortController()
        activeAbort = ac
        set({ sending: true, streamCitations: [], streamPhase: 'retrieving' })
        const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed }
        const assistantId = uid()
        set((s) => ({
          messages: [
            ...s.messages,
            userMsg,
            { id: assistantId, role: 'assistant', content: '', reasoning: '', citations: [] },
          ],
        }))
        armStallTimer(assistantId)

        try {
          await streamChat(
            trimmed,
            {
              onToken: (chunk) => {
                clearStallTimer()
                set((s) => ({
                  streamPhase: 'answering',
                  messages: s.messages.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + chunk } : m,
                  ),
                }))
              },
              onReasoning: (chunk) => {
                clearStallTimer()
                set((s) => ({
                  streamPhase: 'reasoning',
                  messages: s.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, reasoning: (m.reasoning || '') + chunk }
                      : m,
                  ),
                }))
              },
              onPhase: (phase) => {
                set({ streamPhase: phase })
              },
              onCitation: (citation) => {
                if (!citation.snippet?.trim() && !citation.document_id && !citation.chunk_id) {
                  return
                }
                set((s) => ({
                  streamCitations: [...s.streamCitations, citation],
                  messages: s.messages.map((m) => {
                    if (m.id !== assistantId) return m
                    return { ...m, citations: [...(m.citations ?? []), citation] }
                  }),
                }))
              },
              onUsage: (usage) => set({ lastUsage: usage }),
              onToolCall: (payload) => {
                clearStallTimer()
                const name = String(payload.name || '工具')
                let args: unknown = payload.args
                if (typeof args === 'string') {
                  try { args = JSON.parse(args) } catch { /* keep string */ }
                }
                set((s) => ({
                  streamPhase: 'using_tool',
                  messages: s.messages.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolActivities: [
                            ...(m.toolActivities ?? []),
                            {
                              name,
                              args,
                              status: 'running' as const,
                              call_id: String(payload.call_id || ''),
                            },
                          ],
                        }
                      : m,
                  ),
                }))
              },
              onToolResult: (payload) => {
                clearStallTimer()
                const name = String(payload.name || '工具')
                const callId = String(payload.call_id || '')
                set((s) => ({
                  messages: s.messages.map((m) => {
                    if (m.id !== assistantId) return m
                    const acts = [...(m.toolActivities ?? [])]
                    let idx = callId
                      ? acts.findIndex(
                          (a) => a.status === 'running' && a.call_id === callId,
                        )
                      : -1
                    if (idx < 0) {
                      idx = acts.map((a) => a.status).lastIndexOf('running')
                    }
                    if (idx < 0) {
                      acts.push({ name, result: payload.result, status: payload.is_error ? 'error' : 'done' })
                    } else {
                      acts[idx] = { ...acts[idx], result: payload.result, status: payload.is_error ? 'error' : 'done' }
                    }
                    return { ...m, toolActivities: acts }
                  }),
                }))
              },
              onToolError: (payload) => {
                clearStallTimer()
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolActivities: [
                            ...(m.toolActivities ?? []),
                            {
                              name: String(payload.name || '工具'),
                              result: payload.result ?? payload.message,
                              status: 'error' as const,
                            },
                          ],
                        }
                      : m,
                  ),
                }))
              },
              onComplianceBlocked: (payload) => {
                clearStallTimer()
                const suggestion =
                  typeof payload.suggestion === 'string' && payload.suggestion.trim()
                    ? `\n建议改写：${payload.suggestion.trim()}`
                    : ''
                set((s) => ({
                  streamPhase: null,
                  messages: s.messages.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          role: 'assistant' as const,
                          content: `该问题已被合规策略拦截，未调用模型。${suggestion}`,
                        }
                      : m,
                  ),
                }))
              },
              onComplianceWarning: (payload) => {
                const matches = Array.isArray(payload.matches)
                  ? (payload.matches as Array<{ term?: unknown }>)
                      .map((x) => String(x.term || '').trim())
                      .filter(Boolean)
                  : []
                const note = matches.length
                  ? `⚠️ 合规提示：命中敏感词「${matches.join('、')}」，请注意措辞。\n\n`
                  : '⚠️ 合规提示：回答中包含敏感内容，请注意措辞。\n\n'
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === assistantId && !m.content
                      ? { ...m, content: note }
                      : m,
                  ),
                }))
              },
              onConversationId: (id) => {
                set((s) => {
                  const titleOverrides = rememberTitle(
                    s.titleOverrides,
                    id,
                    provisionalTitle,
                  )
                  const threads = [...s.threads]
                  const idx = threads.findIndex((t) => t.id === id)
                  if (idx >= 0) {
                    if (isPlaceholderTitle(threads[idx].title)) {
                      threads[idx] = { ...threads[idx], title: provisionalTitle }
                    }
                  } else if (isNewThread) {
                    threads.unshift({
                      id,
                      title: provisionalTitle,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  return { conversationId: id, threads, titleOverrides }
                })
                if (isNewThread) {
                  void renameThread(id, provisionalTitle).catch(() => {
                    /* agent may also set title */
                  })
                }
              },
              onDone: () => {
                clearStallTimer()
                set((s) => ({
                  streamPhase: null,
                  messages: s.messages.map((m) => {
                    if (m.id !== assistantId) return m
                    if (m.content.trim() || (m.reasoning || '').trim()) return m
                    // Model returned an empty completion (e.g. quota / upstream
                    // outage). Surface as error — never invent a fake answer.
                    return {
                      ...m,
                      role: 'error' as const,
                      content: '未能生成回复，请稍后重试。',
                    }
                  }),
                }))
                window.setTimeout(() => {
                  void get().refreshThreads()
                }, 600)
              },
              onError: (message) => {
                clearStallTimer()
                set((s) => ({
                  streamPhase: null,
                  messages: s.messages.map((m) =>
                    m.id === assistantId ? { ...m, role: 'error', content: message } : m,
                  ),
                }))
              },
            },
            ac.signal,
            conversationId ?? undefined,
            true,
          )
        } catch (err) {
          if ((err as Error).name === 'AbortError') return
          const message = err instanceof Error ? err.message : '发送失败'
          set((s) => ({
            streamPhase: null,
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, role: 'error', content: message } : m,
            ),
          }))
        } finally {
          clearStallTimer()
          if (activeAbort === ac) activeAbort = null
          set({ sending: false, streamPhase: null })
        }
      },
    }
    },
    {
      name: 'agentdesk-chat-prefs',
      partialize: (s) => ({
        conversationId: s.conversationId,
        titleOverrides: s.titleOverrides,
      }),
    },
  ),
)