import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { GAME_REGISTRY } from '../games/gameRegistry'

// vsPhase: setup → p1-playing → handover → p2-playing → result
export default function VersusGame({ gameId }) {
  const [vsPhase, setVsPhase] = useState('setup')
  const [p2Name,  setP2Name]  = useState('')
  const [p2Input, setP2Input] = useState('')
  const [p1Score, setP1Score] = useState(0)
  const [p2Score, setP2Score] = useState(0)
  const [inputErr, setInputErr] = useState('')
  const { user, recordGame } = useUser()
  const navigate = useNavigate()
  const game = GAME_REGISTRY[gameId]
  if (!game) { navigate('/hub'); return null }
  const GameComponent = game.component

  // ── Setup ──────────────────────────────────────────────
  if (vsPhase === 'setup') {
    return (
      <div className="page items-center justify-center px-6 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="orb orb-cyan"   style={{ top: '-5%',  left: '-10%' }} />
          <div className="orb orb-purple" style={{ bottom: '5%', right: '-10%' }} />
        </div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 relative z-10">
          <span className="text-4xl">{game.icon}</span>
          <h2 className="font-orbitron text-2xl font-black mt-2 tracking-wider" style={{ color: game.color }}>
            {game.label}
          </h2>
          <p className="font-orbitron text-sm neon-text-purple mt-1 tracking-widest">⚔ HEAD TO HEAD ⚔</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6 w-full max-w-sm relative z-10"
          style={{ border: `1px solid ${game.color}44` }}>

          {/* P1 */}
          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl"
            style={{ background: `${game.color}11`, border: `1px solid ${game.color}33` }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-orbitron font-black text-sm"
              style={{ background: `${game.color}22`, color: game.color }}>
              {user.avatar || 'P1'}
            </div>
            <div>
              <p className="font-rajdhani text-xs text-gray-500 tracking-widest">PLAYER 1</p>
              <p className="font-orbitron text-sm font-bold" style={{ color: game.color }}>{user.username}</p>
            </div>
          </div>

          <p className="font-orbitron text-xs text-gray-400 tracking-widest text-center mb-4">VS</p>

          {/* P2 name input */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-orbitron font-black text-sm flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#666' }}>P2</div>
            <input type="text" value={p2Input}
              onChange={e => { setP2Input(e.target.value); setInputErr('') }}
              onKeyDown={e => e.key === 'Enter' && startVersus()}
              placeholder="OPPONENT NAME" maxLength={16}
              className="flex-1 bg-transparent border border-gray-700 rounded-lg px-3 py-2.5
                         font-orbitron text-xs text-white placeholder-gray-700 tracking-widest
                         focus:outline-none focus:border-gray-400 transition-all" />
          </div>
          {inputErr && <p className="text-arcade-pink text-xs font-rajdhani ml-13 mb-2">{inputErr}</p>}

          <motion.button whileTap={{ scale: 0.96 }} onClick={startVersus}
            className="w-full mt-4 py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold"
            style={{ background: `${game.color}18`, border: `1px solid ${game.color}`, color: game.color }}>
            ⚡ START BATTLE
          </motion.button>

          <button onClick={() => navigate('/hub')}
            className="w-full mt-3 py-2 font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
            CANCEL
          </button>
        </motion.div>
      </div>
    )

    function startVersus() {
      const name = p2Input.trim()
      if (name.length < 2)  { setInputErr('Min 2 characters'); return }
      if (name.length > 16) { setInputErr('Max 16 characters'); return }
      if (name.toLowerCase() === user.username.toLowerCase()) { setInputErr("Can't be same as P1"); return }
      setP2Name(name)
      setVsPhase('p1-playing')
    }
  }

  // ── P1 playing ─────────────────────────────────────────
  if (vsPhase === 'p1-playing') {
    return (
      <div className="relative">
        <PlayerBanner name={user.username} avatar={user.avatar} label="PLAYER 1 — YOUR TURN" color={game.color} />
        <div style={{ paddingTop: 40 }}>
          <GameComponent onFinish={(score) => { setP1Score(score); setVsPhase('handover') }} />
        </div>
      </div>
    )
  }

  // ── Handover ───────────────────────────────────────────
  if (vsPhase === 'handover') {
    return (
      <div className="page items-center justify-center px-6 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center">
          <div className="text-6xl mb-4">🔄</div>
          <h2 className="font-orbitron text-xl font-black neon-text-cyan mb-2">HAND IT OVER!</h2>
          <p className="font-rajdhani text-gray-400 text-sm mb-1">
            <span style={{ color: game.color }}>{user.username}</span> scored
          </p>
          <p className="font-orbitron text-5xl font-black mb-4" style={{ color: game.color }}>{p1Score}</p>
          <p className="font-rajdhani text-gray-400 text-sm">
            Pass the device to <span className="text-white font-bold">{p2Name}</span>
          </p>
        </motion.div>

        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setVsPhase('p2-playing')}
          className="w-full max-w-xs py-4 rounded-2xl font-orbitron text-sm tracking-widest font-black"
          style={{ background: `${game.color}18`, border: `1px solid ${game.color}`, color: game.color }}>
          {p2Name} — TAP TO START ▶
        </motion.button>
      </div>
    )
  }

  // ── P2 playing ─────────────────────────────────────────
  if (vsPhase === 'p2-playing') {
    return (
      <div className="relative">
        <PlayerBanner name={p2Name} avatar="👤" label="PLAYER 2 — YOUR TURN" color="#bf00ff" />
        <div style={{ paddingTop: 40 }}>
          <GameComponent onFinish={(score) => {
            setP2Score(score)
            setVsPhase('result')
            // Record match for P1 (logged-in user)
            const p1Won = p1Score > score
            const isDraw = p1Score === score
            recordGame({
              game: gameId,
              score: p1Score,
              mode: 'versus',
              won: isDraw ? null : p1Won,
              p2Name,
              p2Score: score,
            })
          }} />
        </div>
      </div>
    )
  }

  // ── Result ─────────────────────────────────────────────
  if (vsPhase === 'result') {
    const p1Wins  = p1Score > p2Score
    const p2Wins  = p2Score > p1Score
    const isDraw  = p1Score === p2Score
    const winner  = isDraw ? null : p1Wins ? user.username : p2Name
    const diff    = Math.abs(p1Score - p2Score)

    return (
      <div className="page px-5 pt-8 pb-8 items-center justify-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6">
          <span className="text-4xl">{isDraw ? '🤝' : p1Wins ? '🏆' : '🎖️'}</span>
          <h2 className={`font-orbitron text-3xl font-black mt-2 ${isDraw ? 'neon-text-gold' : 'neon-text-cyan'}`}>
            {isDraw ? 'DRAW!' : `${winner} WINS!`}
          </h2>
          <p className="font-rajdhani text-gray-500 text-sm mt-1">{game.label}</p>
        </motion.div>

        {/* Score cards */}
        <div className="flex gap-3 w-full max-w-sm mb-5">
          {[
            { name: user.username, avatar: user.avatar, score: p1Score, wins: p1Wins, color: game.color },
            { name: p2Name,        avatar: '👤',        score: p2Score, wins: p2Wins, color: '#bf00ff'  },
          ].map((p, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex-1 glass-card rounded-2xl p-4 text-center relative overflow-hidden"
              style={{
                border: `1px solid ${p.wins ? p.color : 'rgba(255,255,255,0.08)'}`,
                boxShadow: p.wins ? `0 0 25px ${p.color}33` : 'none',
              }}>
              {p.wins && <div className="absolute top-2 right-2 text-sm">👑</div>}
              <div className="text-2xl mb-1">{p.avatar}</div>
              <p className="font-rajdhani text-xs text-gray-400 mb-2 truncate">{p.name}</p>
              <p className="font-orbitron text-3xl font-black"
                style={{ color: p.wins ? p.color : isDraw ? '#ffd700' : '#555' }}>
                {p.score}
              </p>
            </motion.div>
          ))}
        </div>

        {!isDraw && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="font-rajdhani text-gray-500 text-sm mb-6">
            Won by <span className="text-white font-bold">{diff}</span> point{diff !== 1 ? 's' : ''}
          </motion.p>
        )}

        {/* Share */}
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const txt = isDraw
              ? `🎮 Drew with ${p2Name} in ${game.label}! Both scored ${p1Score}. Play ArcadiaDuels!`
              : p1Wins
              ? `🏆 Beat ${p2Name} in ${game.label}! ${p1Score} vs ${p2Score}. Play ArcadiaDuels!`
              : `🎖️ Scored ${p1Score} vs ${p2Name}'s ${p2Score} in ${game.label}. Rematch coming! ArcadiaDuels`
            navigator.clipboard?.writeText(txt).catch(() => {})
          }}
          className="w-full max-w-xs py-2 rounded-xl font-orbitron text-xs tracking-widest mb-4 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#888' }}>
          📋 COPY RESULT TO SHARE
        </motion.button>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <motion.button whileTap={{ scale: 0.96 }}
            onClick={() => { setVsPhase('setup'); setP1Score(0); setP2Score(0) }}
            className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold"
            style={{ background: `${game.color}18`, border: `1px solid ${game.color}`, color: game.color }}>
            ⚔ REMATCH
          </motion.button>
          <button onClick={() => navigate('/hub')}
            className="w-full py-3 rounded-xl font-orbitron text-xs text-gray-500 border border-gray-800 hover:text-gray-300 transition-all">
            BACK TO HUB
          </button>
        </div>
      </div>
    )
  }

  return null
}

function PlayerBanner({ name, avatar, label, color }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 px-4"
      style={{ background: `${color}15`, borderBottom: `1px solid ${color}33` }}>
      <span className="text-sm">{avatar}</span>
      <span className="font-orbitron text-[10px] tracking-widest" style={{ color }}>{label}:</span>
      <span className="font-orbitron text-[10px] font-black text-white">{name}</span>
    </div>
  )
}
