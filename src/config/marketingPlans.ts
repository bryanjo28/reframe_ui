export type MarketingPlan = {
  code: 'free' | 'starter' | 'creator' | 'pro'
  name: string
  price: string
  interval?: string
  credits: string
  personas: number
  pillars: number
  threads: boolean
  schedule: boolean
  popular?: boolean
}

export const MARKETING_PLANS: readonly MarketingPlan[] = [
  { code: 'free', name: 'Free', price: 'Gratis', credits: '6 AI Credits sekali daftar', personas: 1, pillars: 1, threads: false, schedule: false },
  { code: 'starter', name: 'Starter', price: 'Rp29.000', interval: '/bulan', credits: '200 AI Credits/bulan', personas: 2, pillars: 3, threads: true, schedule: true },
  { code: 'creator', name: 'Creator', price: 'Rp59.000', interval: '/bulan', credits: '600 AI Credits/bulan', personas: 5, pillars: 10, threads: true, schedule: true, popular: true },
  { code: 'pro', name: 'Pro', price: 'Rp99.000', interval: '/bulan', credits: '1.200 AI Credits/bulan', personas: 10, pillars: 20, threads: true, schedule: true },
] as const
