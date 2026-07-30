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
}: {
  title: string
  items: MenuItem[]
  activePage: NavKey
  onNavigate: (page: NavKey) => void
}) {
  return (
    <div className="menu-group">
      <p className="menu-title">{title}</p>
      <nav>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`menu-item${activePage === item.key ? ' active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <AppIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export function Sidebar({ activePage, onNavigate, currentUser, onLogout }: SidebarProps) {
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

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <p className="eyebrow">Reframe</p>
            <strong>{displayName}</strong>
          </div>
        </div>

        <SidebarSection
          title="Workspace"
          items={workspaceMenu}
          activePage={activePage}
          onNavigate={onNavigate}
        />

        <SidebarSection
          title="Account"
          items={accountMenu}
          activePage={activePage}
          onNavigate={onNavigate}
        />
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-card token-card">
          <p className="sidebar-card-label">Token Usage</p>
          <strong>
            {usedTokens.toLocaleString('id-ID')} / {(tokenLimit ?? 0).toLocaleString('id-ID')}
          </strong>
          <span>{planName} dipakai sebagai batas usage saat ini.</span>
          <div className="token-track" aria-hidden="true">
            <span className="token-track-fill" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>

        <button className="sidebar-logout-button" type="button" onClick={onLogout}>
          <AppIcon name="logout" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
