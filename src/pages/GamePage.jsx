import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { GAME_REGISTRY } from '../games/gameRegistry'
import DailyGame from './DailyGame'

export default function GamePage() {
  const { gameId, mode } = useParams()
  const { user } = useUser()
  const navigate = useNavigate()

  if (!GAME_REGISTRY[gameId]) return <Navigate to="/hub" />

  if (mode === 'daily') return <DailyGame gameId={gameId} />

  const game = GAME_REGISTRY[gameId]
  const GameComponent = game.component

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top bar: quit + guest notice ── */}
      <div className="flex items-center justify-between px-3 flex-shrink-0"
        style={{
          height: 44,
          background: 'rgba(8,8,24,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
        }}>

        {/* Back button */}
        <button onClick={() => navigate('/hub')}
          className="flex items-center gap-1.5 font-orbitron text-[10px] tracking-widest transition-colors"
          style={{ color: '#9ca3af', minHeight: 'unset' }}>
          <span style={{ fontSize: 13 }}>‹</span> HUB
        </button>

        {/* Game name */}
        <span className="font-orbitron text-[10px] tracking-widest" style={{ color: game.color }}>
          {game.icon} {game.label}
        </span>

        {/* Guest sign-up or empty spacer */}
        {!user ? (
          <button onClick={() => navigate('/')}
            className="font-orbitron text-[9px] tracking-widest transition-colors"
            style={{ color: '#00f5ff', minHeight: 'unset' }}>
            SIGN UP →
          </button>
        ) : (
          <div style={{ width: 60 }} />
        )}
      </div>

      {/* Game */}
      <div className="flex-1">
        <GameComponent />
      </div>
    </div>
  )
}
