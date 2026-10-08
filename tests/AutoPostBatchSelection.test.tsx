import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { AutoPostPage } from '../src/pages/AutoPostPage'

test('sends one auto-post request per checked content without legacy batch fields', async () => {
  const requestBodies: Record<string, unknown>[] = []

  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)

    if (url.includes('/api/threads/auto-post') && init?.method === 'POST') {
      requestBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.includes('/api/content-outputs')) {
      return new Response(JSON.stringify({
        success: true,
        data: [
          { id: 'output-1', title: 'Konten pertama', platform: 'threads', status: 'approved' },
          { id: 'output-2', title: 'Konten kedua', platform: 'threads', status: 'approved' },
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }))

  const user = userEvent.setup()
  render(
    <ToastProvider>
      <AutoPostPage userId="user-1" isThreadsConnected onConnectThreads={vi.fn()} />
    </ToastProvider>,
  )

  await user.click(await screen.findByRole('button', { name: /Konten pertama/ }))
  await user.click(screen.getByRole('button', { name: /Konten kedua/ }))
  expect(screen.getByText('2 konten dipilih')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Pilih waktu' }))
  expect(screen.getByText('Waktu (WIB)')).toBeInTheDocument()
  expect(screen.queryByText('WIB', { selector: 'small' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Jadwalkan 2 konten' }))

  await waitFor(() => expect(requestBodies).toHaveLength(2))
  expect(requestBodies.map((body) => body.contentOutputId)).toEqual(['output-1', 'output-2'])
  requestBodies.forEach((body) => {
    expect(body.scheduledAt).toEqual(expect.any(String))
    expect(body).not.toHaveProperty('limit')
    expect(body).not.toHaveProperty('personaConfigId')
    expect(body).not.toHaveProperty('contentOutputIds')
  })
})
