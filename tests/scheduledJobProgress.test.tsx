import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { ContentGenerationProgress } from '../src/components/ContentGenerationProgress'
import {
  autoGenerateContentOutputs,
  getScheduledJobId,
} from '../src/services/contentOutputs'
import {
  getScheduledJobById,
  isScheduledJobProgressTerminal,
} from '../src/services/threadsAutoPost'

test('reads the created job id from the auto-generate response', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          contents: [],
          data: {
            id: 'job-123',
            scheduledJob: { id: 'job-123', status: 'active' },
            summary: { targetCount: 5, scheduledAt: '2026-09-29T10:00:00.000Z' },
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  )

  const response = await autoGenerateContentOutputs({
    contentPillarId: 'pillar-1',
    targetCount: 5,
    scheduledAt: '2026-09-29T10:00:00.000Z',
  })

  expect(getScheduledJobId(response)).toBe('job-123')
})

test('normalizes progress returned by the scheduled job endpoint', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'job-123',
            status: 'active',
            progress: {
              status: 'running',
              targetCount: 5,
              fetchedCount: 5,
              processedCount: 2,
              successCount: 2,
              failedCount: 0,
              percentage: 40,
              startedAt: '2026-09-29T10:00:00.000Z',
              finishedAt: null,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  )

  const job = await getScheduledJobById('job-123')

  expect(job.progress).toEqual({
    status: 'running',
    targetCount: 5,
    fetchedCount: 5,
    processedCount: 2,
    successCount: 2,
    failedCount: 0,
    percentage: 40,
    startedAt: '2026-09-29T10:00:00.000Z',
    finishedAt: null,
  })
  expect(isScheduledJobProgressTerminal(job.progress)).toBe(false)
})

test('renders processed count and percentage in the floating progress alert', () => {
  render(
    <ContentGenerationProgress
      progress={{
        status: 'running',
        targetCount: 5,
        fetchedCount: 5,
        processedCount: 2,
        successCount: 2,
        failedCount: 0,
        percentage: 40,
        startedAt: '2026-09-29T10:00:00.000Z',
        finishedAt: null,
      }}
    />,
  )

  expect(screen.getByRole('status')).toHaveTextContent('2 of 5 content processing')
  expect(screen.getByText('40%')).toBeInTheDocument()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
})

test('renders an indeterminate loading bar when generation has no progress data', () => {
  render(<ContentGenerationProgress label="Generating topics..." />)

  expect(screen.getByRole('status')).toHaveTextContent('Generating topics...')
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
})

test('recognizes every terminal progress status', () => {
  expect(isScheduledJobProgressTerminal({ status: 'completed' })).toBe(true)
  expect(isScheduledJobProgressTerminal({ status: 'completed_with_errors' })).toBe(true)
  expect(isScheduledJobProgressTerminal({ status: 'failed' })).toBe(true)
  expect(isScheduledJobProgressTerminal({ status: 'pending' })).toBe(false)
})
