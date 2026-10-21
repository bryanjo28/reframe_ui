import { expect, test } from 'vitest'

import { normalizeCurrentSubscription } from '../src/services/subscriptionPlans'

test('prefers the active nested plan over stale top-level plan metadata', () => {
  const subscription = normalizeCurrentSubscription({
    planId: 'pro',
    planKey: 'pro',
    planName: 'Pro',
    status: 'active',
    plan: {
      id: 'starter-plan',
      code: 'starter',
      name: 'Starter',
      monthlyAiCredits: 200,
    },
  })

  expect(subscription).toMatchObject({
    planId: 'starter-plan',
    planKey: 'starter',
    planName: 'Starter',
    monthlyAiCredits: 200,
  })
})
