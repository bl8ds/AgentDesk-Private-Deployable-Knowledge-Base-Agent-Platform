import { FormEvent, useState } from 'react'

export function ChatComposer({
  disabled,
  onSend,
}: {
  disabled: boolean
  onSend: (text: string) => void
}) {
  const [input, setInput] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    onSend(text)
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入消息…"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
      />
      <button type="submit" className="btn" disabled={disabled || !input.trim()}>
        {disabled ? '发送中' : '发送'}
      </button>
    </form>
  )
}