export type NavKey =
  | 'dashboard'
  | 'personalize'
  | 'create-persona-chat'
  | 'create-persona'
  | 'content-pillar'
  | 'generate-topic'
  | 'content-engine'
  | 'manual-post'
  | 'auto-post'
  | 'subscription-plans'
  | 'connecting-apps'

export type AppTheme = 'dark' | 'light'

export type MenuItem = {
  key: NavKey
  label: string
  icon: string
}
