import { AppIcon } from './AppIcon'
import type { NavKey } from '../types/navigation'
import type { AuthUser } from '../services/authService'
import { dismissModal } from '../utils/modalAnimation'
import { withCurrentBrand } from '../utils/brand'
import type { UiLanguage } from '../utils/uiLanguage'

type Props = {
  activePage: NavKey
  isMoreOpen: boolean
  onNavigate: (page: NavKey) => void
  onToggleMore: () => void
  onCloseMore: () => void
  currentUser: AuthUser | null
  language: UiLanguage
}

const primary: Array<{ key: NavKey; label: string; icon: string }> = [
  { key: 'dashboard', label: 'Home', icon: 'grid' },
  { key: 'create', label: 'Create', icon: 'plus' },
  { key: 'content-bank', label: 'Content', icon: 'layers' },
  { key: 'auto-post', label: 'Schedule', icon: 'calendar' },
]

const secondary: Array<{ key: NavKey; label: string; icon: string }> = [
  { key: 'personalize', label: 'Persona & Pillar', icon: 'user' },
  { key: 'referral', label: 'Referral & Rewards', icon: 'sparkles' },
]

const settingsPages: NavKey[] = ['settings', 'connecting-apps', 'subscription-plans', 'ai-credits', 'payments', 'top-up-credits', 'referral']

const createFlowPages: NavKey[] = ['create', 'generate-topic', 'content-engine', 'manual-post']

export function MobileNavigation(props: Props) {
  const name = withCurrentBrand(props.currentUser?.fullName || props.currentUser?.accountName || props.currentUser?.name || props.currentUser?.username || 'Pengguna alurin')
  const isBillingPage = ['subscription-plans', 'ai-credits', 'top-up-credits', 'payments'].includes(props.activePage)
  const english = props.language === 'en'
  return (
    <>
      {props.isMoreOpen ? (
        <div className="mobile-more-backdrop" role="presentation" onClick={(event) => dismissModal(props.onCloseMore, event.currentTarget)}>
          <section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="More navigation" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-heading">
              <div><p className="eyebrow">Lainnya</p><h2>Akun & workspace</h2></div>
            </div>
            <button className="mobile-account-summary" type="button" onClick={() => props.onNavigate('settings')}><span>{name.charAt(0).toUpperCase()}</span><div><strong>{name}</strong><small>{props.currentUser?.email || 'Lihat detail akun'}</small><em>Lihat profil & pengaturan</em></div><AppIcon name="chevron-right" /></button>
            <nav className="mobile-more-list">
              {secondary.map((item) => (
                <button type="button" key={item.key} onClick={() => props.onNavigate(item.key)}>
                  <AppIcon name={item.icon} /><span>{item.label}</span><AppIcon name="chevron-right" />
                </button>
              ))}
              <button
                type="button"
                className={`mobile-billing-shortcut${isBillingPage ? ' active' : ''}`}
                onClick={() => props.onNavigate('ai-credits')}
                aria-label={english ? 'Subscription & AI Credits' : 'Langganan & AI Credits'}
                aria-current={isBillingPage ? 'page' : undefined}
              >
                <AppIcon name="sparkles" />
                <span>{english ? 'Subscription & AI Credits' : 'Langganan & AI Credits'}</span>
                <AppIcon name="chevron-right" />
              </button>
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
        <button type="button" className={props.isMoreOpen || settingsPages.includes(props.activePage) || secondary.some((item) => item.key === props.activePage) ? 'active' : ''} onClick={props.onToggleMore}>
          <AppIcon name="menu" /><span>More</span>
        </button>
      </nav>
    </>
  )
}
