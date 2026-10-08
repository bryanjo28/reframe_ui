import { AppIcon } from './AppIcon'
import type { NavKey } from '../types/navigation'
import type { AuthUser } from '../services/authService'

type Props = {
  activePage: NavKey
  isMoreOpen: boolean
  onNavigate: (page: NavKey) => void
  onToggleMore: () => void
  onCloseMore: () => void
  currentUser: AuthUser | null
}

const primary: Array<{ key: NavKey; label: string; icon: string }> = [
  { key: 'dashboard', label: 'Home', icon: 'grid' },
  { key: 'create', label: 'Create', icon: 'plus' },
  { key: 'content-bank', label: 'Content', icon: 'layers' },
  { key: 'auto-post', label: 'Schedule', icon: 'calendar' },
]

const secondary: Array<{ key: NavKey; label: string; icon: string }> = [
  { key: 'personalize', label: 'Content Brain', icon: 'user' },
  { key: 'connecting-apps', label: 'Connected Accounts', icon: 'link' },
  { key: 'subscription-plans', label: 'Subscription', icon: 'calendar' },
]

const createFlowPages: NavKey[] = ['create', 'generate-topic', 'content-engine', 'manual-post']

export function MobileNavigation(props: Props) {
  const name = props.currentUser?.fullName || props.currentUser?.accountName || props.currentUser?.name || props.currentUser?.username || 'Pengguna Reframe'
  return (
    <>
      {props.isMoreOpen ? (
        <div className="mobile-more-backdrop" role="presentation" onClick={props.onCloseMore}>
          <section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="More navigation" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-heading">
              <div><p className="eyebrow">Lainnya</p><h2>Akun & workspace</h2></div>
              <button type="button" className="icon-button" onClick={props.onCloseMore} aria-label="Close"><AppIcon name="close" /></button>
            </div>
            <button className="mobile-account-summary" type="button" onClick={() => props.onNavigate('settings')}><span>{name.charAt(0).toUpperCase()}</span><div><strong>{name}</strong><small>{props.currentUser?.email || 'Lihat detail akun'}</small><em>Lihat profil & pengaturan</em></div><AppIcon name="chevron-right" /></button>
            <nav className="mobile-more-list">
              {secondary.map((item) => (
                <button type="button" key={item.key} onClick={() => props.onNavigate(item.key)}>
                  <AppIcon name={item.icon} /><span>{item.label}</span><AppIcon name="chevron-right" />
                </button>
              ))}
            </nav>
            <nav className="mobile-more-list mobile-settings-link"><button type="button" onClick={() => props.onNavigate('settings')}><AppIcon name="menu" /><span>Semua Pengaturan</span><AppIcon name="chevron-right" /></button></nav>
          </section>
        </div>
      ) : null}
      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {primary.map((item) => (
          <button type="button" key={item.key} data-tour-step={item.key === 'create' ? 0 : undefined} className={item.key === 'create' ? (createFlowPages.includes(props.activePage) ? 'active' : '') : (props.activePage === item.key ? 'active' : '')} onClick={() => props.onNavigate(item.key)}>
            <AppIcon name={item.icon} /><span>{item.label}</span>
          </button>
        ))}
        <button type="button" className={props.isMoreOpen || props.activePage === 'settings' || secondary.some((item) => item.key === props.activePage) ? 'active' : ''} onClick={props.onToggleMore}>
          <AppIcon name="menu" /><span>More</span>
        </button>
      </nav>
    </>
  )
}
