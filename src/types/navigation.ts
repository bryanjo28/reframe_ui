export type NavKey =
  | 'dashboard'
  | 'create-persona'
  | 'content-pillar'
  | 'generate-content'
  | 'auto-post'
  | 'connecting-apps'

export type MenuItem = {
  key: NavKey
  label: string
  icon: string
}
