import { useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { GAME_REGISTRY } from '../games/gameRegistry'
import DifficultyPicker from '../components/DifficultyPicker'
import DailyGame from './DailyGame'
import { GameIcon, DiffIcon } from '../components/Icons'

export default function GamePage() {
  const { gameId, mode } = useParams()
  const { user, recordGame } = useUser()
  const navigate             = useNavigate()
  const [difficulty, setDifficulty] = useState(null)

  const handleQuit = () => {
    if (difficulty) {
      recordGame?.({ game: gameId, score: 0, mode: 'solo', won: false })
    }
    navigate('/hub')
  }

  if (!GAME_REGISTRY[gameId]) return <Navigate to="/hub" />
  if (mode === 'daily') return <DailyGame gameId={gameId} />

  const game          = GAME_REGISTRY[gameId]
  const GameComponent = game.component

  const diffColor = difficulty === 'easy' ? '#00ff88' : difficulty === 'hard' ? '#ff006e' : '#ffd700'
  const diffLabel = difficulty === 'easy' ? 'ROOKIE'  : difficulty === 'hard' ? 'VETERAN' : 'CHALLENGER'

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
        <button onClick={handleQuit}
          className="flex items-center gap-1.5 font-orbitron text-[10px] tracking-widest transition-colors"
          style={{ color: '#9ca3af', minHeight: 'unset' }}>
          <span style={{ fontSize: 13 }}>‹</span> HUB
        </button>

        <span className="flex items-center gap-1.5 font-orbitron text-[10px] tracking-widest" style={{ color: game.color }}>
          <GameIcon id={game.id} size={14} color={game.color} strokeWidth={2} />
          {game.label}
        </span>

        {!user ? (
          <button onClick={() => navigate('/')}
            className="font-orbitron text-[9px] tracking-widest"
            style={{ color: '#00f5ff', minHeight: 'unset' }}>
            SIGN UP →
          </button>
        ) : difficulty ? (
          <span className="flex items-center gap-1 font-orbitron text-[9px] tracking-widest px-2 py-0.5 rounded-full"
            style={{ color: diffColor, background: `${diffColor}12`, border: `1px solid ${diffColor}44` }}>
            <DiffIcon level={difficulty} size={11} color={diffColor} strokeWidth={2} />
            {diffLabel}
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
