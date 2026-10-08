import { render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { expect, it, vi } from 'vitest'
import { ToastProvider } from '../src/components/Toast'
import { TokenBalance } from '../src/components/TokenBalance'
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

it('refreshes the visible token balance after usage changes', async () => {
  let requestCount = 0
  notifyUsageChanged()
  vi.stubGlobal('fetch', vi.fn(async () => {
    requestCount += 1
    return new Response(JSON.stringify({
      data: { remaining: requestCount === 1 ? 100 : 90, used: requestCount === 1 ? 0 : 10 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))

  render(createElement(ToastProvider, null, createElement(TokenBalance, { onTopUp: vi.fn() })))
  expect(await screen.findByText('100')).toBeInTheDocument()

  notifyUsageChanged({ usage: { total_tokens: 10 } })

  await waitFor(() => expect(screen.getByText('90')).toBeInTheDocument())
  expect(requestCount).toBe(2)
})
