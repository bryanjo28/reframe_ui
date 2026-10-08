import { expect, it, vi } from 'vitest'
import { extractCreditsUsed, notifyUsageChanged, USAGE_UPDATED_EVENT } from '../src/services/usage'

it('extracts actual credits used from AI responses', () => {
  expect(extractCreditsUsed({ subscription_usage: { creditsUsed: 842 }, usage: { total_tokens: 801 } })).toBe(842)
  expect(extractCreditsUsed({ data: { generationLogs: [{ outputPayload: { aiResponse: { usage: { total_tokens: 513 } } } }] } })).toBe(513)
})

it('announces the token cost when AI usage changes', () => {
  const listener = vi.fn()
  window.addEventListener(USAGE_UPDATED_EVENT, listener)

  notifyUsageChanged({ subscriptionUsage: { creditsUsed: 321 } })

  expect(listener).toHaveBeenCalledOnce()
  expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ creditsUsed: 321 })
  window.removeEventListener(USAGE_UPDATED_EVENT, listener)
})
