import { afterEach, expect, it, vi } from 'vitest'
import { createPaymentOrder, retryPaymentCheckout, getNotifications, getPaymentPage, markPaymentNotificationRead } from '../src/services/payments'

it('retries checkout on the existing order with authorization', async () => {
  localStorage.setItem('alurin.authToken', 'payment-token')
  const request = vi.fn(async () => new Response(JSON.stringify({ data: { id: 'saved-order', checkoutAvailable: true } }), { status: 200 }))
  vi.stubGlobal('fetch', request)
  expect(await retryPaymentCheckout('saved-order')).toMatchObject({ id: 'saved-order', checkoutAvailable: true })
  expect(request).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/api/payments/orders/saved-order/checkout' }), expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer payment-token' }) }))
})

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

it('fetches notifications from the dedicated endpoint with Bearer authorization', async () => {
  localStorage.setItem('alurin.authToken', 'notification-token')
  const notifications = [{ id: 'notification-1', title: 'Top up berhasil' }]
  const request = vi.fn(async () => new Response(JSON.stringify({ data: { data: notifications } }), { status: 200 }))
  vi.stubGlobal('fetch', request)
  expect(await getNotifications()).toEqual(notifications)
  expect(request).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/api/notifications' }), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer notification-token' }) }))
})

it('reads payment histories from nested data and authorizes notification updates', async () => {
  localStorage.setItem('alurin.authToken', 'payment-token')
  const ledger = [{ id: 'ledger-1', credits_delta: -2, balance_after: 98, transaction_type: 'ai_usage', source_type: null, created_at: '2026-10-14T08:00:00Z' }]
  const usageHistory = [{ request_id: 'request-1', feature: 'generate_topic', total_tokens: 1500, credits_charged: 2, status: 'success', created_at: '2026-10-14T08:00:00Z' }]
  const request = vi.fn(async () => new Response(JSON.stringify({ data: { data: { ledger, usageHistory } } }), { status: 200 }))
  vi.stubGlobal('fetch', request)
  expect(await getPaymentPage()).toMatchObject({ ledger, usageHistory, notifications: [] })
  await markPaymentNotificationRead('notification-1')
  expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ pathname: '/api/payments/notifications/notification-1/read' }), expect.objectContaining({ method: 'PATCH', headers: expect.objectContaining({ Authorization: 'Bearer payment-token' }) }))
})

it('creates top-up and subscription orders with the selected payment method', async () => {
  const request = vi.fn(async () => new Response(JSON.stringify({
    data: {
      id: 'order-1',
      status: 'pending',
      credits: 1000,
      amount_idr: 99000,
      payment_method: 'bni_va',
      checkoutAvailable: true,
      checkoutUrl: null,
      payment: {
        va_number: '880812345678',
        total_payment: 100500,
        expired_at: '2026-10-19T12:00:00.000Z',
        qr_string: null,
      },
    },
  }), { status: 200 }))
  vi.stubGlobal('fetch', request)

  await createPaymentOrder({ packageId: 'plus-id', method: 'bni_va' })
  expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual({
    packageId: 'plus-id',
    method: 'bni_va',
  })

  await createPaymentOrder({ planId: 'creator-id', method: 'qris' })
  expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body))).toEqual({
    planId: 'creator-id',
    method: 'qris',
  })
})
