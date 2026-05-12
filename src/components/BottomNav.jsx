import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { path: '/hub',         icon: '🎮', label: 'HUB'     },
  { path: '/profile',     icon: '👤', label: 'PROFILE'  },
  { path: '/leaderboard', icon: '🏆', label: 'SCORES'   },
]

export default function BottomNav() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{ maxWidth: 480, margin: '0 auto', left: 0, right: 0 }}>
      <div className="flex items-stretch"
        style={{
          background: 'rgba(8,8,24,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
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
                style={{ color: active ? '#00f5ff' : '#444' }}>
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
