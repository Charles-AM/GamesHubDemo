import { useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { GAME_REGISTRY } from '../games/gameRegistry'
import DifficultyPicker from '../components/DifficultyPicker'
import DailyGame from './DailyGame'

export default function GamePage() {
  const { gameId, mode } = useParams()
  const { user }         = useUser()
  const navigate         = useNavigate()
  const [difficulty, setDifficulty] = useState(null)

  if (!GAME_REGISTRY[gameId]) return <Navigate to="/hub" />
  if (mode === 'daily') return <DailyGame gameId={gameId} />

  const game          = GAME_REGISTRY[gameId]
  const GameComponent = game.component

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 flex-shrink-0"
        style={{
          height: 44,
          background: 'rgba(8,8,24,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
        }}>
        <button onClick={() => navigate('/hub')}
          className="flex items-center gap-1.5 font-orbitron text-[10px] tracking-widest transition-colors"
          style={{ color: '#9ca3af', minHeight: 'unset' }}>
          <span style={{ fontSize: 13 }}>‹</span> HUB
        </button>

        <span className="font-orbitron text-[10px] tracking-widest" style={{ color: game.color }}>
          {game.icon} {game.label}
        </span>

        {!user ? (
          <button onClick={() => navigate('/')}
            className="font-orbitron text-[9px] tracking-widest"
            style={{ color: '#00f5ff', minHeight: 'unset' }}>
            SIGN UP →
          </button>
        ) : difficulty ? (
          /* Show current difficulty badge once game is running */
          <span className="font-orbitron text-[9px] tracking-widest px-2 py-0.5 rounded-full"
            style={{
              color:       difficulty === 'easy' ? '#00ff88' : difficulty === 'hard' ? '#ff006e' : '#ffd700',
              background:  difficulty === 'easy' ? 'rgba(0,255,136,0.1)' : difficulty === 'hard' ? 'rgba(255,0,110,0.1)' : 'rgba(255,215,0,0.1)',
              border: `1px solid ${difficulty === 'easy' ? 'rgba(0,255,136,0.3)' : difficulty === 'hard' ? 'rgba(255,0,110,0.3)' : 'rgba(255,215,0,0.3)'}`,
            }}>
            {difficulty === 'easy' ? '🌱 ROOKIE' : difficulty === 'hard' ? '💀 VETERAN' : '⚡ CHALLENGER'}
          </span>
        ) : (
          <div style={{ width: 72 }} />
        )}
      </div>

      {/* ── Difficulty picker or game ── */}
      <div className="flex-1">
        {!difficulty
          ? <DifficultyPicker game={game} onSelect={setDifficulty} />
          : <GameComponent difficulty={difficulty} />
        }
      </div>
    </div>
  )
}
