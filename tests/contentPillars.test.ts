import { expect, test, vi } from 'vitest'

import { createContentPillar } from '../src/services/contentPillars'

test('includes the selected thread type when creating a content pillar', async () => {
  let requestBody: unknown

  vi.stubGlobal(
    'fetch',
    vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body))

      return new Response(
        JSON.stringify({
          data: {
            id: 'pillar-1',
            personaConfigId: 'persona-1',
            pillarName: 'Education',
            threadType: 'long',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }),
  )

  await createContentPillar({
    personaConfigId: 'persona-1',
    name: 'Education',
    templateContent: 'Template',
    targetObjective: 'Awareness',
    audienceSegment: 'Creators',
    keyMessage: 'Teach clearly',
    ctaDirection: 'Follow',
    affiliateLink: '',
    threadType: 'long',
  })

  expect(requestBody).toMatchObject({ threadType: 'long' })
})
