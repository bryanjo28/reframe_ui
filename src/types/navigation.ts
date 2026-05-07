export type NavKey =
  | 'dashboard'
  | 'create-persona-chat'
  | 'create-persona'
  | 'content-pillar'
  | 'generate-topic'
  | 'auto-post'
  | 'connecting-apps'

export type MenuItem = {
  key: NavKey
  label: string
  icon: string
}
