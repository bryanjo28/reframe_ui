import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { ContentEnginePage } from '../src/pages/ContentEnginePage'

test('hides format from the generated content table and editor', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/api/content-outputs')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'output-1',
                userId: 'user-1',
                title: 'A generated thread',
                platform: 'threads',
                content: 'Generated content preview',
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
      <ContentEnginePage userId="user-1" />
    </ToastProvider>,
  )

  await user.click(screen.getByRole('tab', { name: /Content Library/i }))

  expect(await screen.findByText('Generated content preview')).toBeInTheDocument()
  expect(screen.queryByRole('columnheader', { name: 'Format' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Generated content preview' }))

  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.queryByText('Format')).not.toBeInTheDocument()
})
