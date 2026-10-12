import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listPublishedPosts } from './contentOutputs'

describe('listPublishedPosts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.setItem('reframe.authToken', 'test-token')
  })

  it('requests posts by content output and normalizes API data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{
        content_output_id: 'output-1',
        post_url: 'https://www.threads.net/@demo/post/one',
        status: 'success',
        sequence_number: 1,
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listPublishedPosts('output-1')).resolves.toEqual([{
      contentOutputId: 'output-1',
      postUrl: 'https://www.threads.net/@demo/post/one',
      status: 'success',
      sequenceNumber: 1,
    }])
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:3000/api/published-posts?contentOutputId=output-1'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    )
  })
})
