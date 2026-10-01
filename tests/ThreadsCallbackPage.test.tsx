import { describe, expect, it } from 'vitest'

import { buildThreadsCallbackRedirect } from '../src/utils/threadsCallback'

describe('ThreadsCallbackPage', () => {
  it('redirects callback search params to the connecting apps page', () => {
    expect(buildThreadsCallbackRedirect('?connected=true')).toBe('/connecting-apps?connected=true')
  })

  it('keeps error callback params off the public demo root', () => {
    expect(buildThreadsCallbackRedirect('?error=access_denied')).toBe(
      '/connecting-apps?error=access_denied',
    )
  })

  it('drops unrelated or sensitive callback params', () => {
    expect(
      buildThreadsCallbackRedirect('?connected=true&code=secret-code&state=secret-state'),
    ).toBe('/connecting-apps?connected=true')
  })

  it('does not accept non-success connected values', () => {
    expect(buildThreadsCallbackRedirect('?connected=false')).toBe('/connecting-apps')
  })
})
