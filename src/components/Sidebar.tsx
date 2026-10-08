import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from './AppIcon'
import type { MenuItem, NavKey } from '../types/navigation'
import type { AuthUser } from '../services/authService'
import { getCurrentSubscription, listSubscriptionPlans } from '../services/subscriptionPlans'
import { getMyUsage, USAGE_UPDATED_EVENT } from '../services/usage'
import type { AppTheme } from '../types/navigation'
import type { UiLanguage } from '../utils/uiLanguage'

type SidebarProps = {
  activePage: NavKey
  onNavigate: (page: NavKey) => void
  currentUser: AuthUser | null
  onLogout: () => void
  isCollapsed: boolean
  isMobile: boolean
  isOpen: boolean
  theme: AppTheme
  onToggleTheme: () => void
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
]

const settingsMenu: SidebarMenuItem[] = [
  { key: 'settings', label: 'Settings', icon: 'menu' },
  { key: 'personalize', label: 'Content Brain', icon: 'user' },
  { key: 'connecting-apps', label: 'Connected Accounts', icon: 'link' },
  { key: 'subscription-plans', label: 'Subscription', icon: 'calendar' },
  { key: 'payments', label: 'Pembayaran', icon: 'sparkles' },
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
  theme,
  onToggleTheme,
  onToggleCollapse,
  onClose,
  onReplayTutorial,
  language,
  onLanguageChange,
}: SidebarProps) {
  const [usedTokens, setUsedTokens] = useState(0)
  const [tokenLimit, setTokenLimit] = useState<number | null>(null)
  const [planName, setPlanName] = useState('Current plan')

  const displayName =
    currentUser?.accountName ||
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.email ||
    'User'

  useEffect(() => {
    let isMounted = true
    const refreshTimeouts: number[] = []

    async function loadUsage(includePlan = true) {
      try {
        const summary = await getMyUsage({ force: !includePlan })

        if (!includePlan) {
          if (isMounted) {
            setUsedTokens(summary?.used ?? 0)
            setTokenLimit((current) => summary?.limit ?? current)
            setPlanName((current) => summary?.planName || current)
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

        setUsedTokens(summary?.used ?? 0)
        setTokenLimit(activePlan?.monthlyAiCredits ?? summary?.limit ?? null)
        setPlanName(currentSubscription?.planName || activePlan?.name || summary?.planName || 'Current plan')
      } catch {
        if (!isMounted) {
          return
        }

        setUsedTokens(0)
        setTokenLimit(null)
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
  }, [])

  const usagePercent = useMemo(() => {
    if (!tokenLimit || tokenLimit <= 0) {
      return 0
    }

    return Math.min(100, Math.max(0, (usedTokens / tokenLimit) * 100))
  }, [tokenLimit, usedTokens])

  const tokenLimitLabel = tokenLimit !== null && tokenLimit > 0
    ? tokenLimit.toLocaleString('id-ID')
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
          <div className="brand-mark">R</div>
          {!isCollapsed ? (
            <div>
              <p className="eyebrow">Reframe</p>
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
          title="Settings"
          items={settingsMenu}
          activePage={activePage}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />

        <button
          type="button"
          className={`menu-item sidebar-theme-toggle${theme === 'light' ? ' active-theme' : ''}`}
          onClick={onToggleTheme}
          title={isCollapsed ? 'Toggle light mode' : undefined}
          aria-label="Toggle light mode"
        >
          <AppIcon name="sun" />
          {!isCollapsed ? <span>{theme === 'light' ? 'Light Mode On' : 'Light Mode'}</span> : null}
        </button>
        <button type="button" className="menu-item" onClick={onReplayTutorial} title={isCollapsed ? 'Lihat Tutorial Lagi' : undefined} aria-label="Lihat Tutorial Lagi"><AppIcon name="sparkles" />{!isCollapsed ? <span>Lihat Tutorial Lagi</span> : null}</button>
        {!isCollapsed ? <label className="sidebar-language-setting"><span>Bahasa</span><select value={language} onChange={(event) => onLanguageChange(event.target.value as UiLanguage)}><option value="id">Indonesia</option><option value="en">Inggris</option></select></label> : null}
      </div>

      <div className="sidebar-bottom">
        {!isCollapsed ? (
          <div className="sidebar-card token-card">
            <p className="sidebar-card-label">Token Usage</p>
            <strong>
              {usedTokens.toLocaleString('id-ID')} / {tokenLimitLabel}
            </strong>
            <span>{planName} dipakai sebagai batas usage saat ini.</span>
            <div className="token-track" aria-hidden="true">
              <span className="token-track-fill" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        ) : null}

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
