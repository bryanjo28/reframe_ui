import { describe, expect, it } from 'vitest'

import { buildThreadsCallbackRedirect } from '../src/pages/ThreadsCallbackPage'

describe('ThreadsCallbackPage', () => {
  it('redirects callback search params to the connecting apps page', () => {
    expect(buildThreadsCallbackRedirect('?connected=true')).toBe('/connecting-apps?connected=true')
  })

  it('keeps error callback params off the public demo root', () => {
    expect(buildThreadsCallbackRedirect('?error=access_denied')).toBe(
      '/connecting-apps?error=access_denied',
    )
  })
})
