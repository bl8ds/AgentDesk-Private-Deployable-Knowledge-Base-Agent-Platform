import { useChatStore, type ChatMessage } from '../store/chat'

/** Legacy bubble list (kept for non-assistant-ui surfaces). */
export function MessageList({
  messages,
  sending,
}: {
  messages: ChatMessage[]
  sending: boolean
}) {
  if (messages.length === 0) {
    return (
      <p className="muted">请输入问题开始对话。回答将流式返回，并展示知识库引用。</p>
    )
  }

  return (
    <>
      {messages.map((m) => (
        <div
          key={m.id}
          className={[
            'bubble',
            m.role === 'user' ? 'bubbleUser' : 'bubbleAssistant',
            m.role === 'error' ? 'bubbleError' : '',
          ].join(' ')}
        >
          <span className="role">
            {m.role === 'user' ? '我' : m.role === 'error' ? '错误' : '助手'}
          </span>
          {m.reasoning?.trim() ? (
            <details className="reasoning">
              <summary>思考过程</summary>
              <pre>{m.reasoning}</pre>
            </details>
          ) : null}
          {m.toolActivities?.length ? (
            <details className="tool-activities" open>
              <summary>工具调用（{m.toolActivities.length}）</summary>
              {m.toolActivities.map((a, i) => (
                <div className="tool-activity" key={`${a.call_id || a.name}-${i}`}>
                  <span className="tool-name">
                    [{a.status === 'running' ? '调用中' : a.status === 'error' ? '失败' : '完成'}] {a.name}
                  </span>
                  {a.args != null ? (
                    <pre className="tool-args">{JSON.stringify(a.args)}</pre>
                  ) : null}
                  {a.result != null ? (
                    <pre className="tool-result">{JSON.stringify(a.result)}</pre>
                  ) : null}
                </div>
              ))}
            </details>
          ) : null}
          <div className="content">
            {m.content || (sending && m.role === 'assistant' ? '…' : '')}
          </div>
        </div>
      ))}
    </>
  )
}

export function ConnectedMessageList() {
  const messages = useChatStore((s) => s.messages)
  const sending = useChatStore((s) => s.sending)
  return <MessageList messages={messages} sending={sending} />
}