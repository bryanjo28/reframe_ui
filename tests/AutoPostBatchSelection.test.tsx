import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
      <AutoPostPage userId="user-1" threadsStatus="connected" onConnectThreads={vi.fn()} />
    </ToastProvider>,
  )

  await user.click(await screen.findByRole('button', { name: /Konten pertama/ }))
  await user.click(screen.getByRole('button', { name: /Konten kedua/ }))
  expect(screen.getByText('2 konten dipilih')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Pilih waktu' }))
  expect(screen.getByText('Waktu (WIB)')).toBeInTheDocument()
  expect(screen.queryByText('WIB', { selector: 'small' })).not.toBeInTheDocument()
  const dateInput = screen.getByLabelText('Tanggal')
  const timeInput = screen.getByLabelText('Waktu (WIB)')
  const validDate = (dateInput as HTMLInputElement).value
  const validTime = (timeInput as HTMLInputElement).value
  fireEvent.change(dateInput, { target: { value: '2000-01-01' } })
  fireEvent.change(timeInput, { target: { value: '12:00' } })
  await user.click(screen.getByRole('button', { name: 'Jadwalkan 2 konten' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Jadwal harus setelah waktu sekarang')
  expect(requestBodies).toHaveLength(0)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.change(dateInput, { target: { value: validDate } })
  fireEvent.change(timeInput, { target: { value: validTime } })
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

test('offers reconnect instead of treating an expired Threads account as disconnected', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })))
  const onConnectThreads = vi.fn()
  const user = userEvent.setup()
  render(<ToastProvider><AutoPostPage userId="user-1" threadsStatus="needs_reconnect" onConnectThreads={onConnectThreads} /></ToastProvider>)
  await user.click(await screen.findByRole('button', { name: /hubungkan ulang threads/i }))
  expect(onConnectThreads).toHaveBeenCalledOnce()
  expect(screen.getByText(/kedaluwarsa/i)).toBeInTheDocument()
})

test('renders the empty Schedule page fully in English', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })))

  render(
    <ToastProvider language="en">
      <AutoPostPage userId="user-1" threadsStatus="needs_reconnect" onConnectThreads={vi.fn()} language="en" />
    </ToastProvider>,
  )

  expect(await screen.findByRole('heading', { name: 'Schedule' })).toBeInTheDocument()
  expect(screen.getByText('Manage what gets published and when.')).toBeInTheDocument()
  expect(screen.getByText('Your Threads connection has expired. Reconnect your account.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reconnect Threads' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Calendar' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Not scheduled' })).toBeInTheDocument()
  expect(screen.getByText('No content is ready to schedule')).toBeInTheDocument()
  expect(screen.queryByText(/Jadwal|Belum|Hubungkan|konten/i)).not.toBeInTheDocument()
})
