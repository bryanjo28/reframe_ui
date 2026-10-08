import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { ContentBankPage } from '../src/pages/ContentBankPage'

test('edits split Threads in separate Content Bank fields and preserves the delimiter on save', async () => {
  let updateBody: Record<string, unknown> | null = null

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('/api/content-outputs/output-1') && init?.method === 'PATCH') {
        updateBody = JSON.parse(String(init.body)) as Record<string, unknown>
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/api/content-outputs')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'output-1',
                userId: 'user-1',
                title: 'Thread otomotif',
                platform: 'threads',
                content: 'Pembuka thread\n\n---THREAD_SPLIT---\n\nIsi thread kedua',
                status: 'draft',
                createdAt: '2026-09-29T10:00:00.000Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )

  const user = userEvent.setup()

  render(
    <ToastProvider>
      <ContentBankPage userId="user-1" onNavigate={vi.fn()} />
    </ToastProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'Review' }))

  const firstThread = screen.getByRole('textbox', { name: 'Thread 1' })
  const secondThread = screen.getByRole('textbox', { name: 'Thread 2' })

  expect(firstThread).toHaveValue('Pembuka thread')
  expect(secondThread).toHaveValue('Isi thread kedua')

  await user.clear(secondThread)
  await user.type(secondThread, 'Isi kedua dari Content Bank')
  await user.click(screen.getByRole('button', { name: 'Simpan' }))

  await waitFor(() => {
    expect(updateBody).toMatchObject({
      content: 'Pembuka thread\n\n---THREAD_SPLIT---\n\nIsi kedua dari Content Bank',
      status: 'draft',
    })
  })
})

test('approves review content from the Content Bank list instead of the review modal', async () => {
  let updateBody: Record<string, unknown> | null = null

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('/api/content-outputs/output-1') && init?.method === 'PATCH') {
        updateBody = JSON.parse(String(init.body)) as Record<string, unknown>
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        success: true,
        data: [{
          id: 'output-1',
          userId: 'user-1',
          title: 'Thread otomotif',
          platform: 'threads',
          content: 'Konten siap direview',
          status: 'draft',
          createdAt: '2026-09-29T10:00:00.000Z',
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }),
  )

  const user = userEvent.setup()
  render(
    <ToastProvider>
      <ContentBankPage userId="user-1" onNavigate={vi.fn()} />
    </ToastProvider>,
  )

  const reviewButton = await screen.findByRole('button', { name: 'Review' })
  const approveButton = screen.getByRole('button', { name: 'Setujui' })
  expect(reviewButton).toHaveClass('primary-button')
  expect(approveButton).toHaveClass('approve')
  expect(reviewButton.compareDocumentPosition(approveButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

  await user.click(reviewButton)
  const dialog = screen.getByRole('dialog', { name: 'Review konten' })
  expect(within(dialog).queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument()

  await user.click(within(dialog).getByRole('button', { name: 'Batal' }))
  await user.click(screen.getByRole('button', { name: 'Setujui' }))

  await waitFor(() => {
    expect(updateBody).toMatchObject({
      content: 'Konten siap direview',
      status: 'approved',
    })
  })
})
