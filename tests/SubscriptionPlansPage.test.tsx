import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SubscriptionPlansPage } from '../src/pages/SubscriptionPlansPage'
import { getCurrentSubscription, listSubscriptionPlans } from '../src/services/subscriptionPlans'

vi.mock('../src/services/subscriptionPlans', () => ({
  getCurrentSubscription: vi.fn(),
  listSubscriptionPlans: vi.fn(),
}))

describe('SubscriptionPlansPage', () => {
  beforeEach(() => {
    vi.mocked(getCurrentSubscription).mockResolvedValue(null)
    vi.mocked(listSubscriptionPlans).mockResolvedValue([
      {
        id: 'creator-plan',
        key: 'creator',
        name: 'Creator',
        description: 'Paket aktif yang siap dipakai untuk workspace Anda.',
        price: 59000,
        currency: 'IDR',
        interval: 'monthly',
        status: 'active',
        active: true,
        featured: true,
        monthlyAiCredits: 600,
        raw: {
          max_personas: 10,
          max_content_pillars: 5,
          monthly_ai_credits: 600,
          token_allowance: 3000000,
          max_threads_accounts: 1,
          can_schedule: true,
        },
      },
    ])
  })

  it('shows a concise recommended plan card without repeated plan copy', async () => {
    render(<SubscriptionPlansPage userId="user-1" />)

    const recommendation = await screen.findByText('Paling direkomendasikan')
    expect(recommendation.parentElement).toHaveClass('subscription-card', 'recommended')
    expect(recommendation.closest('.subscription-card-head')).toBeNull()
    expect(screen.getByText('10 Persona')).toBeInTheDocument()
    expect(screen.getByText('5 Content Pillar')).toBeInTheDocument()
    expect(screen.getByText('600 AI Credits/bulan')).toBeInTheDocument()
    expect(screen.getByText('1 akun Threads')).toBeInTheDocument()
    expect(screen.getByText('Schedule Post')).toBeInTheDocument()
    expect(screen.queryByText('Token allowance:', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByText('Paket aktif yang siap dipakai untuk workspace Anda.')).not.toBeInTheDocument()
    expect(screen.queryByText('Available')).not.toBeInTheDocument()
    expect(screen.queryByText('Generate Topic, Content, dan Regenerate AI')).not.toBeInTheDocument()
  })
})
