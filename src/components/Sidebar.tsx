import { AppIcon } from './AppIcon'
import type { MenuItem, NavKey } from '../types/navigation'
import type { AuthUser } from '../services/authService'

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
  const displayName =
    currentUser?.accountName ||
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.email ||
    'User'

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
          <strong>2,480 / 10,000</strong>
          <span>Workflow Reframe AI siap dipantau dari sini.</span>
          <div className="token-track" aria-hidden="true">
            <span className="token-track-fill" />
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
