import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from '@assistant-ui/react'
import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from '@assistant-ui/react-markdown'
import { useMemo, useState, type ComponentPropsWithoutRef } from 'react'
import remarkGfm from 'remark-gfm'
import {
  CitationProvider,
  CitationSup,
  isCitationHref,
  pickCitations,
  preprocessCitationMarks,
} from './Citations'
import { useChatStore, type ChatMessage } from '../store/chat'
import { isLiveReasoningTurn, latestAssistantId } from '../lib/reasoningUi'

function phasePlaceholder(phase: string | null | undefined): string {
  switch (phase) {
    case 'retrieving':
      return '检索中…'
    case 'reasoning':
      return '思考中…'
    case 'answering':
      return '生成中…'
    case 'using_tool':
      return '调用工具中…'
    default:
      return '…'
  }
}

function toThreadMessages(
  messages: ChatMessage[],
  streamPhase: string | null,
  sending: boolean,
): ThreadMessageLike[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'error')
    .map((m, idx, arr) => {
      if (m.role === 'user') {
        return {
          role: 'user' as const,
          id: m.id,
          content: [{ type: 'text' as const, text: m.content }],
        }
      }

      if (m.role === 'error') {
        return {
          role: 'assistant' as const,
          id: m.id,
          content: [{ type: 'text' as const, text: m.content || '出错了' }],
          status: {
            type: 'incomplete' as const,
            reason: 'error' as const,
            error: m.content,
          },
        }
      }

      const content: Array<{ type: 'reasoning' | 'text'; text: string }> = []
      if (m.reasoning?.trim()) {
        content.push({ type: 'reasoning', text: m.reasoning })
      }
      if (m.content.trim()) {
        content.push({ type: 'text', text: m.content })
      } else if (!m.reasoning?.trim()) {
        const isLast = idx === arr.length - 1
        content.push({
          type: 'text',
          text: isLast && sending ? phasePlaceholder(streamPhase) : '…',
        })
      }

      return {
        role: 'assistant' as const,
        id: m.id,
        content,
        status: sending && idx === arr.length - 1
          ? { type: 'running' as const }
          : undefined,
      }
    })
}

function convertMessage(message: ThreadMessageLike): ThreadMessageLike {
  return message
}

/** Open while the current turn is reasoning; history stays 「思考过程」. */
function ReasoningPart() {
  const part = useAuiState((s) => {
    if (s.part.type !== 'reasoning') return null
    return s.part
  })
  const text = part?.text ?? ''
  const messageId = useAuiState((s) => s.message.id)
  const sending = useChatStore((s) => s.sending)
  const streamPhase = useChatStore((s) => s.streamPhase)
  const activeAssistantId = useChatStore((s) => latestAssistantId(s.messages))
  const streaming = isLiveReasoningTurn({
    sending,
    streamPhase,
    messageId,
    activeAssistantId,
  })

  const [manual, setManual] = useState<'open' | 'closed' | null>(null)
  const open =
    manual === 'open' ? true : manual === 'closed' ? false : streaming

  if (!text.trim() && !streaming) return null

  return (
    <details
      className="aui-reasoning"
      open={open}
      onToggle={(e) => {
        setManual(e.currentTarget.open ? 'open' : 'closed')
      }}
    >
      <summary>{streaming ? '思考中…' : '思考过程'}</summary>
      <div className="aui-reasoning-body">{text}</div>
    </details>
  )
}

/** Plain text for user bubbles (user input is not markdown). */
function PlainTextPart() {
  const text = useAuiState((s) => {
    if (s.part.type !== 'text') return null
    return s.part.text
  })
  if (!text) return null
  return <p className="aui-text">{text}</p>
}

const mdComponents = memoizeMarkdownComponents({
  a: ({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) => {
    const cite = isCitationHref(href)
    if (cite != null) {
      return <CitationSup index={cite} />
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    )
  },
  strong: ({ children }) => <strong>{children}</strong>,
  p: ({ children }) => <p>{children}</p>,
  li: ({ children }) => <li>{children}</li>,
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
})

/** Assistant replies via @assistant-ui/react-markdown + citation superscripts. */
function MarkdownText() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md"
      smooth={false}
      preprocess={preprocessCitationMarks}
      components={mdComponents}
    />
  )
}

function AssistantMessageView() {
  const messageId = useAuiState((s) => s.message.id)
  const citations = useChatStore((s) =>
    pickCitations(s.messages, messageId, s.streamCitations),
  )

  return (
    <CitationProvider citations={citations}>
      <MessagePrimitive.Root className="aui-row aui-row-assistant">
        <div className="aui-assistant-flat">
          <MessagePrimitive.Content
            components={{
              Reasoning: ReasoningPart,
              Text: MarkdownText,
            }}
          />
        </div>
      </MessagePrimitive.Root>
    </CitationProvider>
  )
}

function EmptyState() {
  return (
    <div className="aui-empty">
      <div className="aui-empty-mark" aria-hidden>
        格
      </div>
      <p className="aui-empty-hello">您好，我是AgentDesk</p>
      <p className="aui-empty-desc">请输入问题，我将基于知识库为您解答。</p>
    </div>
  )
}

export function AssistantChat() {
  const messages = useChatStore((s) => s.messages)
  const sending = useChatStore((s) => s.sending)
  const streamPhase = useChatStore((s) => s.streamPhase)
  const lastUsage = useChatStore((s) => s.lastUsage)
  const send = useChatStore((s) => s.send)
  const cancelSend = useChatStore((s) => s.cancelSend)

  const runtime = useExternalStoreRuntime({
    isRunning: sending,
    messages: toThreadMessages(messages, streamPhase, sending),
    convertMessage,
    onNew: async (message) => {
      const text = message.content
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('')
      await send(text)
    },
    onCancel: async () => {
      cancelSend()
    },
  })

  const threadMessages = useMemo(
    () => ({
      UserMessage: () => (
        <MessagePrimitive.Root className="aui-row aui-row-user">
          <div className="aui-bubble aui-bubble-user">
            <MessagePrimitive.Content components={{ Text: PlainTextPart }} />
          </div>
        </MessagePrimitive.Root>
      ),
      AssistantMessage: AssistantMessageView,
    }),
    [],
  )

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="aui-root">
        <ThreadPrimitive.Viewport className="aui-viewport" autoScroll>
          <ThreadPrimitive.Empty>
            <EmptyState />
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages components={threadMessages} />

          <ThreadPrimitive.ViewportFooter className="aui-footer">
            {lastUsage?.total_tokens != null ? (
              <p className="aui-usage">
                用量 {lastUsage.total_tokens}
                {lastUsage.model ? ` · ${lastUsage.model}` : ''}
              </p>
            ) : null}

            <ComposerPrimitive.Root className="aui-composer">
              <div className="aui-composer-row">
                <ComposerPrimitive.Input
                  placeholder="输入问题…"
                  className="aui-input"
                  rows={1}
                  autoFocus
                />
                <ComposerPrimitive.Send className="aui-send">
                  {sending ? '…' : '发送'}
                </ComposerPrimitive.Send>
                <ComposerPrimitive.Cancel className="aui-cancel">停止</ComposerPrimitive.Cancel>
              </div>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  )
}