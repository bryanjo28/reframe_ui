import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { ContentEnginePage } from '../src/pages/ContentEnginePage'

test('does not show the redundant Content Bank shortcut', () => {
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

  render(
    <ToastProvider>
      <ContentEnginePage userId="user-1" />
    </ToastProvider>,
  )

  expect(screen.queryByRole('button', { name: /Lihat Konten Saya/i })).not.toBeInTheDocument()
})
