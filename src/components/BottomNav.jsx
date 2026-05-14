import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { path: '/hub',     icon: '🎮', label: 'HUB'     },
  { path: '/room',    icon: '⚔️', label: 'BATTLE'   },
  { path: '/profile', icon: '👤', label: 'PROFILE'  },
]

export default function BottomNav() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 z-50"
      style={{ left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480 }}>
      <div className="flex items-stretch"
        style={{
          background: 'var(--nav-bg)',
          borderTop: '1px solid var(--nav-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {TABS.map(tab => {
          const active = pathname === tab.path
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center py-3 gap-1 transition-all"
              style={{ minHeight: 60 }}>
              <span className="text-xl" style={{ filter: active ? 'drop-shadow(0 0 6px #00f5ff)' : 'none', opacity: active ? 1 : 0.35 }}>
                {tab.icon}
              </span>
              <span className="font-orbitron text-[9px] tracking-widest"
                style={{ color: active ? '#00f5ff' : 'var(--txt-3)' }}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute bottom-0 h-0.5 w-10 rounded-full"
                  style={{ background: '#00f5ff', boxShadow: '0 0 8px #00f5ff' }} />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
