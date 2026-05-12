import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser, todayKey, ACHIEVEMENTS } from '../context/UserContext'
import { GAME_REGISTRY } from '../games/gameRegistry'

export default function DailyGame({ gameId }) {
  const { recordGame } = useUser()
  const navigate = useNavigate()
  const game = GAME_REGISTRY[gameId]
  const [result, setResult] = useState(null)

  if (!game) { navigate('/hub'); return null }
  const GameComponent = game.component

  const handleFinish = (score) => {
    const outcome = recordGame({ game: gameId, score, isDaily: true })
    localStorage.setItem(`arcadia_daily_done_${todayKey()}`, gameId)
    setResult({ score, ...outcome })
  }

  if (result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="orb orb-cyan"   style={{ top: '-5%', left: '-10%' }} />
          <div className="orb orb-purple" style={{ bottom: '5%', right: '-8%' }} />
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center w-full max-w-xs">

          <div className="text-5xl mb-4">📅</div>
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-1">DAILY CHALLENGE</p>
          <h2 className="font-orbitron text-2xl font-black neon-text-gold mb-1">{game.label}</h2>
          <p className="font-rajdhani text-sm text-gray-400 mb-6">COMPLETE!</p>

          {/* Score */}
          <div className="glass-card rounded-2xl p-5 mb-4 text-center"
            style={{ border: '1px solid rgba(255,215,0,0.3)' }}>
            <p className="font-rajdhani text-xs text-gray-500 tracking-widest mb-1">FINAL SCORE</p>
            <motion.p initial={{ scale: 0.5 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="font-orbitron text-5xl font-black neon-text-gold">
              {result.score}
            </motion.p>
          </div>

          {/* XP earned */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between"
            style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)' }}>
            <div className="text-left">
              <p className="font-orbitron text-xs text-gray-400 tracking-wider">XP EARNED</p>
              {result.leveledUp && (
                <p className="font-orbitron text-[10px] mt-0.5" style={{ color: '#00ff88' }}>
                  ⬆ LEVEL UP! → LV.{result.newLevel}
                </p>
              )}
            </div>
            <p className="font-orbitron text-2xl font-black" style={{ color: '#ffd700' }}>
              +{result.xpEarned}
            </p>
          </motion.div>

          {/* Achievements unlocked */}
          {result.unlocked?.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="rounded-2xl p-4 mb-6"
              style={{ background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)' }}>
              <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-2">🏅 ACHIEVEMENTS UNLOCKED</p>
              {result.unlocked.map(id => {
                const a = ACHIEVEMENTS.find(x => x.id === id)
                return a ? (
                  <p key={id} className="font-rajdhani text-sm text-white">{a.icon} {a.name}</p>
                ) : null
              })}
            </motion.div>
          )}

          <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate('/hub')}
            className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold"
            style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.5)', color: '#ffd700' }}>
            ← BACK TO HUB
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Daily banner */}
      <div className="flex items-center justify-center gap-2 py-2 px-4"
        style={{ background: 'rgba(255,215,0,0.08)', borderBottom: '1px solid rgba(255,215,0,0.25)' }}>
        <span className="font-orbitron text-[10px] tracking-widest" style={{ color: '#ffd700' }}>
          📅 DAILY CHALLENGE · {game.icon} {game.label} · 2× XP
        </span>
      </div>
      <GameComponent onFinish={handleFinish} />
    </div>
  )
}
