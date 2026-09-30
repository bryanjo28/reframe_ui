import { afterEach, describe, expect, it, vi } from 'vitest'

import { autoGenerateContentOutputs } from '../src/services/contentOutputs'
import { generateContentTopics } from '../src/services/contentTopics'

describe('content generation API errors', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes the backend error returned by topic generation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error_code: 'DAILY_GENERATION_LIMIT_EXCEEDED',
            message: 'Batas generate topic harian sudah tercapai.',
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    await expect(
      generateContentTopics({
        contentPillarId: 'pillar-1',
        templateText: '',
        jumlahTopics: 5,
      }),
    ).rejects.toMatchObject({
      status: 429,
      code: 'DAILY_GENERATION_LIMIT_EXCEEDED',
      message: 'Batas generate topic harian sudah tercapai.',
    })
  })

  it('exposes the backend error returned by content generation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error_code: 'MONTHLY_AI_CREDITS_EXCEEDED',
            message: 'Kredit AI bulanan kamu sudah habis.',
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    await expect(
      autoGenerateContentOutputs({
        contentPillarId: 'pillar-1',
        targetCount: 5,
        scheduledAt: '2026-09-30T10:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      status: 429,
      code: 'MONTHLY_AI_CREDITS_EXCEEDED',
      message: 'Kredit AI bulanan kamu sudah habis.',
    })
  })
})
