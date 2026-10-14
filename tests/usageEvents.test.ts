import { render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ToastProvider } from '../src/components/Toast'
import { TokenBalance } from '../src/components/TokenBalance'
import { extractCreditsUsed, getMyUsage, notifyUsageChanged, USAGE_UPDATED_EVENT } from '../src/services/usage'
import { SESSION_EXPIRED_EVENT } from '../src/utils/apiError'

beforeEach(() => {
  localStorage.clear()
  notifyUsageChanged()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('reads the current credit balances from the nested usage contract and sends the access token', async () => {
  localStorage.setItem('alurin.authToken', 'usage-token')
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    data: {
      data: {
        credits: {
          total: 98,
          subscription: 80,
          topUp: 18,
          usedThisMonth: 12,
          nearestTopUpExpiration: null,
        },
      },
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)

  await expect(getMyUsage({ force: true })).resolves.toMatchObject({
    credits: { total: 98, subscription: 80, topUp: 18, usedThisMonth: 12 },
  })
  expect(fetchMock).toHaveBeenCalledWith(
    expect.objectContaining({ pathname: '/api/usage/me' }),
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer usage-token' }) }),
  )
})

it('signals an expired session when usage responds with 401', async () => {
  localStorage.setItem('alurin.authToken', 'expired-token')
  const listener = vi.fn()
  window.addEventListener(SESSION_EXPIRED_EVENT, listener, { once: true })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

  await expect(getMyUsage({ force: true })).resolves.toBeNull()
  expect(listener).toHaveBeenCalledOnce()
})

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
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    if (new URL(input.toString()).pathname === '/api/notifications') {
      return new Response(JSON.stringify({ data: { notifications: [] } }), { status: 200 })
    }
    requestCount += 1
    return new Response(JSON.stringify({
      data: { data: { credits: {
        total: requestCount === 1 ? 100 : 90,
        subscription: requestCount === 1 ? 100 : 90,
        topUp: 0,
        usedThisMonth: requestCount === 1 ? 0 : 10,
        nearestTopUpExpiration: null,
      } } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))

  render(createElement(ToastProvider, null, createElement(TokenBalance, { onOpenCredits: vi.fn(), onTopUp: vi.fn() })))
  expect(await screen.findByText('100')).toBeInTheDocument()

  notifyUsageChanged({ usage: { total_tokens: 10 } })

  await waitFor(() => expect(screen.getByText('90')).toBeInTheDocument())
  expect(requestCount).toBe(2)
})
