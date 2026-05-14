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

  const GameComponent = GAME_REGISTRY[gameId].component

  return (
    <div className="min-h-screen flex flex-col">
      {!user && (
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{
            background: 'rgba(0,245,255,0.05)',
            borderBottom: '1px solid rgba(0,245,255,0.15)',
          }}>
          <span className="font-rajdhani text-xs text-gray-400">
            Playing as Guest — scores won't be saved
          </span>
          <button onClick={() => navigate('/')}
            className="font-orbitron text-[9px] tracking-widest"
            style={{ color: '#00f5ff', minHeight: 'unset' }}>
            SIGN UP →
          </button>
        </div>
      )}
      <div className="flex-1">
        <GameComponent />
      </div>
    </div>
  )
}
