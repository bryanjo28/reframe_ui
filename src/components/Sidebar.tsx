import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from './AppIcon'
import type { MenuItem, NavKey } from '../types/navigation'
import type { AuthUser } from '../services/authService'
import { getCurrentSubscription, listSubscriptionPlans } from '../services/subscriptionPlans'
import { getMyUsage } from '../services/usage'

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
}

const workspaceMenu: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { key: 'personalize', label: 'Personalize', icon: 'sparkles' },
  { key: 'generate-topic', label: 'Generate Topic', icon: 'sparkles' },
  { key: 'content-engine', label: 'Content Engine', icon: 'calendar' },
  { key: 'auto-post', label: 'Auto Post', icon: 'clock' },
]

const accountMenu: MenuItem[] = [
  { key: 'subscription-plans', label: 'Subscription Plans', icon: 'calendar' },
  { key: 'connecting-apps', label: 'Connecting Apps', icon: 'link' },
]

function SidebarSection({
  title,
  items,
  activePage,
  onNavigate,
  isCollapsed,
}: {
  title: string
  items: MenuItem[]
  activePage: NavKey
  onNavigate: (page: NavKey) => void
  isCollapsed: boolean
}) {
  return (
    <div className="menu-group">
      {!isCollapsed ? <p className="menu-title">{title}</p> : null}
      <nav>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`menu-item${activePage === item.key ? ' active' : ''}`}
            onClick={() => onNavigate(item.key)}
            title={isCollapsed ? item.label : undefined}
            aria-label={item.label}
          >
            <AppIcon name={item.icon} />
            {!isCollapsed ? <span>{item.label}</span> : null}
          </button>
        ))}
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

    async function loadUsage() {
      try {
        const [summary, currentSubscription, subscriptionPlans] = await Promise.all([
          getMyUsage(),
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

    return () => {
      isMounted = false
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
            <AppIcon name={isMobile ? 'close' : 'panel-left'} />
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
          items={workspaceMenu}
          activePage={activePage}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />

        <SidebarSection
          title="Account"
          items={accountMenu}
          activePage={activePage}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />
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
