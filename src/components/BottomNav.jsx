import { useNavigate, useLocation } from 'react-router-dom'
import { NavIcon } from './Icons'

const TABS = [
  { path: '/hub',     icon: 'hub',     label: 'HUB'    },
  { path: '/room',    icon: 'battle',  label: 'BATTLE'  },
  { path: '/profile', icon: 'profile', label: 'PROFILE' },
]

export default function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 z-50"
      style={{ left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480 }}>
      <div className="flex items-stretch"
        style={{
          background: 'rgba(8,8,24,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {TABS.map(tab => {
          const active = pathname === tab.path
          const color  = active ? '#00f5ff' : '#3a3a4a'
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center py-3 gap-1.5 transition-all relative"
              style={{ minHeight: 60 }}>
              <NavIcon
                name={tab.icon} size={20} color={color}
                strokeWidth={active ? 2 : 1.5}
                className="transition-all"
                style={{ filter: active ? 'drop-shadow(0 0 5px rgba(0,245,255,0.7))' : 'none' }}
              />
              <span className="font-orbitron text-[9px] tracking-widest transition-all"
                style={{ color: active ? '#00f5ff' : '#3a3a4a' }}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute bottom-0 h-0.5 w-8 rounded-full"
                  style={{ background: '#00f5ff', boxShadow: '0 0 8px #00f5ff' }} />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
