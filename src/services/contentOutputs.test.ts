import { afterEach, describe, expect, it, vi } from 'vitest'
import { createContentOutput } from './contentOutputs'

describe('createContentOutput', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends one topic generation request with the selected variant count', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await createContentOutput({
      topicId: 'topic-123',
      variantCount: 4,
      additionalPrompt: 'Gunakan tone santai',
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe('http://localhost:3000/api/content-outputs/generate')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      topicId: 'topic-123',
      variantCount: 4,
      additionalPrompt: 'Gunakan tone santai',
    })
  })

  it('defaults to one variant when no count is supplied', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await createContentOutput({
      topicId: 'topic-456',
      additionalPrompt: '',
    })

    const [, init] = fetchSpy.mock.calls[0] as [URL, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      topicId: 'topic-456',
      variantCount: 1,
      additionalPrompt: '',
    })
  })
})
