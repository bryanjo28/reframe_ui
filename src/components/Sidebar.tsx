import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from './AppIcon'
import { BrandLogo } from './BrandLogo'
import type { MenuItem, NavKey } from '../types/navigation'
import type { AuthUser } from '../services/authService'
import { getCurrentSubscription, listSubscriptionPlans } from '../services/subscriptionPlans'
import { getMyUsage, USAGE_UPDATED_EVENT } from '../services/usage'
import type { UiLanguage } from '../utils/uiLanguage'
import { translatePlanName } from '../utils/uiLanguage'
import { withCurrentBrand } from '../utils/brand'

type SidebarProps = {
  activePage: NavKey
  onNavigate: (page: NavKey) => void
  currentUser: AuthUser | null
  onLogout: () => void
  isCollapsed: boolean
  isMobile: boolean
  isOpen: boolean
  onToggleCollapse: () => void
  onClose: () => void
  onReplayTutorial: () => void
  language: UiLanguage
  onLanguageChange: (language: UiLanguage) => void
}

type SidebarMenuItem = MenuItem & {
  disabledReason?: string
}

const overviewMenu: SidebarMenuItem[] = [
  { key: 'dashboard', label: 'Home', icon: 'grid' },
  { key: 'create', label: 'Create', icon: 'plus' },
  { key: 'content-bank', label: 'Content Bank', icon: 'layers' },
  { key: 'auto-post', label: 'Schedule', icon: 'calendar' },
  { key: 'referral', label: 'Referral & Rewards', icon: 'sparkles' },
]

const contentBrainMenu: SidebarMenuItem[] = [
  { key: 'personalize', label: 'Content Brain', icon: 'user' },
]

const settingsMenu: SidebarMenuItem[] = [
  { key: 'settings', label: 'Settings', icon: 'menu' },
]

function isMenuItemActive(activePage: NavKey, itemKey: NavKey) {
  if (itemKey === 'create') {
    return ['create', 'generate-topic', 'content-engine', 'manual-post'].includes(activePage)
  }

  if (itemKey === 'personalize') {
    return activePage === 'personalize' || activePage === 'create-persona' || activePage === 'create-persona-chat'
  }

  return activePage === itemKey
}

function SidebarSection({
  title,
  items,
  activePage,
  onNavigate,
  isCollapsed,
}: {
  title: string
  items: SidebarMenuItem[]
  activePage: NavKey
  onNavigate: (page: NavKey) => void
  isCollapsed: boolean
}) {
  return (
    <div className="menu-group">
      {!isCollapsed ? <p className="menu-title">{title}</p> : null}
      <nav>
        {items.map((item) => {
          const isDisabled = Boolean(item.disabledReason)
          const isActive = isMenuItemActive(activePage, item.key)
          const tooltip = isDisabled ? `${item.label} — ${item.disabledReason}` : item.label

          return (
            <div className="menu-entry" key={item.key}>
              <button
                type="button"
                data-tour-step={item.key === 'create' ? 0 : undefined}
                className={`menu-item${isActive ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}
                onClick={() => onNavigate(item.key)}
                title={isCollapsed ? tooltip : undefined}
                aria-label={tooltip}
                aria-disabled={isDisabled}
                disabled={isDisabled}
              >
                <span className="menu-item-icon"><AppIcon name={item.icon} /></span>
                {!isCollapsed ? <span className="menu-item-label">{item.label}</span> : null}
              </button>
              {!isCollapsed && item.disabledReason ? (
                <span className="menu-disabled-reason">{item.disabledReason}</span>
              ) : null}
            </div>
          )
        })}
      </nav>
    </div>
  )
}

export function Sidebar({
  activePage,
  onNavigate,
  currentUser,
  onLogout,
  isCollapsed,
  isMobile,
  isOpen,
  onToggleCollapse,
  onClose,
  onReplayTutorial,
  language,
  onLanguageChange,
}: SidebarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [usedCredits, setUsedCredits] = useState<number | null>(null)
  const [creditLimit, setCreditLimit] = useState<number | null>(null)
  const [planName, setPlanName] = useState('Current plan')
  const [planKey, setPlanKey] = useState('')

  const displayName = withCurrentBrand(
    currentUser?.accountName ||
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.email ||
    'User',
  )

  useEffect(() => {
    let isMounted = true
    const refreshTimeouts: number[] = []

    async function loadUsage(includePlan = true) {
      try {
        const summary = await getMyUsage({ force: !includePlan })

        if (!includePlan) {
          if (isMounted) {
            setUsedCredits(summary?.credits.usedThisMonth ?? null)
          }
          return
        }

        const [currentSubscription, subscriptionPlans] = await Promise.all([
          getCurrentSubscription(),
          listSubscriptionPlans(),
        ])

        if (!isMounted) {
          return
        }

        const activePlan = currentSubscription
          ? subscriptionPlans.find((plan) => {
              return (
                (currentSubscription.planId && plan.id === currentSubscription.planId) ||
                (currentSubscription.planKey && plan.key === currentSubscription.planKey) ||
                plan.name === currentSubscription.planName
              )
            })
          : null

        setUsedCredits(summary?.credits.usedThisMonth ?? null)
        setCreditLimit(activePlan?.monthlyAiCredits ?? null)
        setPlanName(currentSubscription?.planName || activePlan?.name || 'Current plan')
        setPlanKey(activePlan?.key || currentSubscription?.planKey || '')
      } catch {
        if (!isMounted) {
          return
        }

        setUsedCredits(null)
        setCreditLimit(null)
        setPlanName('Current plan')
      }
    }

    void loadUsage()

    function handleUsageUpdated() {
      void loadUsage(false)

      // Backend usage persistence may complete just after the generate response.
      for (const delay of [1200, 3500]) {
        refreshTimeouts.push(window.setTimeout(() => void loadUsage(false), delay))
      }
    }

    window.addEventListener(USAGE_UPDATED_EVENT, handleUsageUpdated)

    return () => {
      isMounted = false
      window.removeEventListener(USAGE_UPDATED_EVENT, handleUsageUpdated)
      refreshTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [language])

  const usagePercent = useMemo(() => {
    if (usedCredits === null || !creditLimit || creditLimit <= 0) {
      return 0
    }

    return Math.min(100, Math.max(0, (usedCredits / creditLimit) * 100))
  }, [creditLimit, usedCredits])

  const creditLimitLabel = creditLimit !== null && creditLimit > 0
    ? creditLimit.toLocaleString('id-ID')
    : '-'

  return (
    <aside
      className={`sidebar${isCollapsed ? ' collapsed' : ''}${isMobile ? ' mobile' : ''}${isOpen ? ' open' : ''}`}
    >
      <div className="sidebar-top">
        <div className="sidebar-toolbar">
          <button
            className="sidebar-toggle-button"
            type="button"
            onClick={isMobile ? onClose : onToggleCollapse}
            aria-label={isMobile ? 'Tutup sidebar' : isCollapsed ? 'Buka sidebar' : 'Collapse sidebar'}
            aria-expanded={isMobile ? isOpen : !isCollapsed}
          >
            <AppIcon name={isMobile ? 'close' : 'menu'} />
          </button>
        </div>

        <div className="brand">
          <BrandLogo compact />
          {!isCollapsed ? (
            <div>
              <p className="eyebrow">alurin</p>
              <strong>{displayName}</strong>
            </div>
          ) : null}
        </div>

        <SidebarSection
          title="Workspace"
          items={overviewMenu}
          activePage={activePage}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />

        <SidebarSection
          title="Content Brain"
          items={contentBrainMenu}
          activePage={activePage}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />

        <SidebarSection
          title="Settings"
          items={settingsMenu}
          activePage={activePage}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />

        <button type="button" className="menu-item" onClick={onReplayTutorial} title={isCollapsed ? 'Lihat Tutorial Lagi' : undefined} aria-label="Lihat Tutorial Lagi"><AppIcon name="sparkles" />{!isCollapsed ? <span>Lihat Tutorial Lagi</span> : null}</button>
        {!isCollapsed ? <label className="sidebar-language-setting"><span>Bahasa</span><select value={language} onChange={(event) => onLanguageChange(event.target.value as UiLanguage)}><option value="id">Indonesia</option><option value="en">Inggris</option></select></label> : null}
        {currentUser?.role === 'admin' ? <button type="button" className="menu-item sidebar-admin-shortcut" onClick={() => onNavigate('admin')} title="Admin Dashboard" aria-label="Admin Dashboard"><AppIcon name="lock" />{!isCollapsed ? <span>Admin Dashboard</span> : null}</button> : null}
      </div>

      <div className="sidebar-bottom">
        {!isCollapsed ? (
          <div className="sidebar-card token-card">
            <p className="sidebar-card-label">AI Credit Usage</p>
            <strong>
              {usedCredits === null ? '-' : usedCredits.toLocaleString('id-ID')} / {creditLimitLabel}
            </strong>
            <span>{language === 'en' ? `${translatePlanName(planName, planKey, language)} sets your current usage limit.` : `${planName} dipakai sebagai batas penggunaan saat ini.`}</span>
            <div className="token-track" aria-hidden="true">
              <span className="token-track-fill" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        ) : null}

        <div className="sidebar-profile-menu">
          <button
            className="sidebar-profile-trigger"
            type="button"
            onClick={() => setIsProfileMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            aria-label="Buka menu profil"
          >
            <span className="sidebar-profile-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
            {!isCollapsed ? <><span className="sidebar-profile-copy"><strong>{displayName}</strong><small>Menu profil</small></span><AppIcon name="chevron-right" /></> : null}
          </button>
          {isProfileMenuOpen ? (
            <div className="sidebar-profile-popover" role="menu" aria-label="Menu profil">
              {currentUser?.role === 'admin' ? (
                <button type="button" role="menuitem" aria-current={activePage === 'admin' ? 'page' : undefined} onClick={() => { setIsProfileMenuOpen(false); onNavigate('admin') }}>
                  <AppIcon name="lock" /><span>Admin Dashboard</span>
                </button>
              ) : null}
              <button type="button" role="menuitem" onClick={() => { setIsProfileMenuOpen(false); onNavigate('settings') }}>
                <AppIcon name="user" /><span>Profile & Settings</span>
              </button>
            </div>
          ) : null}
        </div>

        <button
          className="sidebar-logout-button"
          type="button"
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : undefined}
          aria-label="Logout"
        >
          <AppIcon name="logout" />
          {!isCollapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
  )
}
