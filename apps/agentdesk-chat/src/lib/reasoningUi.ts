import type { ChatMessage } from '../store/chat'

/** Only the in-flight assistant turn may show live 「思考中…」 labels. */
export function isLiveReasoningTurn(opts: {
  sending: boolean
  streamPhase: string | null
  messageId: string
  activeAssistantId: string | null
}): boolean {
  if (!opts.sending) return false
  if (!opts.activeAssistantId || opts.messageId !== opts.activeAssistantId) {
    return false
  }
  return opts.streamPhase === 'reasoning'
}

export function latestAssistantId(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'assistant') return messages[i]!.id
  }
  return null
}