import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const GAMES = [
  {
    id: 'trivia',
    name: 'TRIVIA QUIZ',
    desc: 'Race to answer 10 questions fastest',
    icon: '🧠',
    tag: 'KNOWLEDGE',
    gradient: 'linear-gradient(135deg, rgba(0,245,255,0.25), rgba(0,80,255,0.2))',
    border: 'rgba(0,245,255,0.5)',
    glow: 'rgba(0,245,255,0.2)',
    accent: '#00f5ff',
    tagBg: 'rgba(0,245,255,0.15)',
  },
  {
    id: 'wordle',
    name: 'WORDLE DUEL',
    desc: 'Guess the 5-letter word in fewest tries',
    icon: '🔤',
    tag: 'WORD',
    gradient: 'linear-gradient(135deg, rgba(0,255,136,0.25), rgba(0,180,80,0.2))',
    border: 'rgba(0,255,136,0.5)',
    glow: 'rgba(0,255,136,0.2)',
    accent: '#00ff88',
    tagBg: 'rgba(0,255,136,0.15)',
  },
  {
    id: 'crossword',
    name: 'CROSSWORD',
    desc: 'Fill the grid before your opponent',
    icon: '✏️',
    tag: 'PUZZLE',
    gradient: 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,140,0,0.2))',
    border: 'rgba(255,215,0,0.5)',
    glow: 'rgba(255,215,0,0.2)',
    accent: '#ffd700',
    tagBg: 'rgba(255,215,0,0.15)',
  },
  {
    id: 'wordsearch',
    name: 'WORD SEARCH',
    desc: 'Find all hidden words before time runs out',
    icon: '🔍',
    tag: 'SEARCH',
    gradient: 'linear-gradient(135deg, rgba(255,0,110,0.25), rgba(180,0,200,0.2))',
    border: 'rgba(255,0,110,0.5)',
    glow: 'rgba(255,0,110,0.2)',
    accent: '#ff006e',
    tagBg: 'rgba(255,0,110,0.15)',
  },
  {
    id: 'flags',
    name: 'FLAG FRENZY',
    desc: 'Match the flag to its country fastest',
    icon: '🌍',
    tag: 'GEOGRAPHY',
    gradient: 'linear-gradient(135deg, rgba(191,0,255,0.25), rgba(80,0,200,0.2))',
    border: 'rgba(191,0,255,0.5)',
    glow: 'rgba(191,0,255,0.2)',
    accent: '#bf00ff',
    tagBg: 'rgba(191,0,255,0.15)',
  },
]

export default function Hub() {
  const { user, scores, logout } = useUser()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen pb-16 relative overflow-hidden">

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-5%',  left: '-10%' }} />
        <div className="orb orb-purple" style={{ bottom: '10%', right: '-10%' }} />
        <div className="orb orb-pink"   style={{ top: '50%',  left: '40%'  }} />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <p className="font-rajdhani text-gray-500 text-xs tracking-widest uppercase">Welcome back</p>
          <h2 className="font-orbitron text-xl font-black tracking-wider"
            style={{ background: 'linear-gradient(90deg, #00f5ff, #bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {user.username}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-orbitron text-[10px] text-gray-600">ARCADE</p>
            <p className="font-orbitron text-base font-black neon-text-purple">DUELS 🕹️</p>
          </div>
          <button onClick={logout} className="font-orbitron text-xs text-gray-600 hover:text-gray-300 transition-colors">EXIT</button>
        </div>
      </div>

      <div className="h-px mx-5 mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.4), rgba(191,0,255,0.4), transparent)' }} />

      <p className="font-orbitron text-xs text-gray-500 tracking-widest text-center mb-5 relative z-10">
        ✦ CHOOSE YOUR BATTLE ✦
      </p>

      {/* Game cards */}
      <div className="px-4 flex flex-col gap-4 relative z-10">
        {GAMES.map((game, i) => {
          const s = scores[game.id]
          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.09, duration: 0.4, type: 'spring', stiffness: 120 }}
              style={{
                background: game.gradient,
                border: `1px solid ${game.border}`,
                boxShadow: `0 4px 30px ${game.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                borderRadius: '1.25rem',
                backdropFilter: 'blur(16px)',
              }}
              className="p-4 overflow-hidden relative"
            >
              {/* Decorative circle */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
                style={{ background: game.gradient }} />

              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Icon bubble */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${game.accent}22`, border: `1px solid ${game.accent}44` }}>
                    {game.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-rajdhani tracking-widest px-2 py-0.5 rounded-full font-bold"
                      style={{ background: game.tagBg, color: game.accent }}>
                      {game.tag}
                    </span>
                    <h3 className="font-orbitron text-sm font-black mt-1" style={{ color: game.accent }}>
                      {game.name}
                    </h3>
                  </div>
                </div>

                {s && (
                  <div className="text-right flex-shrink-0">
                    <p className="font-rajdhani text-[10px] text-gray-500 tracking-wider">BEST</p>
                    <p className="font-orbitron text-lg font-black" style={{ color: game.accent }}>{s.best}</p>
                    <p className="font-rajdhani text-[10px] text-gray-600">{s.plays} plays</p>
                  </div>
                )}
              </div>

              <p className="font-rajdhani text-gray-300 text-sm mb-4">{game.desc}</p>

              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/game/${game.id}/solo`)}
                  className="flex-1 py-2.5 rounded-xl font-orbitron text-[11px] font-bold tracking-wider transition-all"
                  style={{
                    background: `${game.accent}22`,
                    border: `1px solid ${game.accent}88`,
                    color: game.accent,
                  }}
                >
                  ▶ SOLO
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/game/${game.id}/versus`)}
                  className="flex-1 py-2.5 rounded-xl font-orbitron text-[11px] font-bold tracking-wider
                             border border-gray-600 text-gray-300 hover:border-gray-400 transition-all"
                >
                  ⚔ VS FRIEND
                </motion.button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
