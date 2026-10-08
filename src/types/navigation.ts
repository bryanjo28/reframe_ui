export type NavKey =
  | 'dashboard'
  | 'create'
  | 'content-bank'
  | 'personalize'
  | 'create-persona-chat'
  | 'create-persona'
  | 'content-pillar'
  | 'generate-topic'
  | 'content-engine'
  | 'manual-post'
  | 'auto-post'
  | 'subscription-plans'
  | 'payments'
  | 'connecting-apps'
  | 'settings'

export type AppTheme = 'dark' | 'light'

export type MenuItem = {
  key: NavKey
  label: string
  icon: string
}
