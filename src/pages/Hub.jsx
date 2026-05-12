import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const GAMES = [
  { id: 'trivia',     name: 'TRIVIA QUIZ',   desc: 'Answer 10 questions fastest',    icon: '🧠', color: 'cyan',   tag: 'KNOWLEDGE' },
  { id: 'wordle',     name: 'WORDLE DUEL',   desc: 'Guess the word in fewer tries',  icon: '🔤', color: 'green',  tag: 'WORD'      },
  { id: 'crossword',  name: 'CROSSWORD',     desc: 'Fill the grid before opponent',  icon: '✏️', color: 'gold',   tag: 'PUZZLE'    },
  { id: 'wordsearch', name: 'WORD SEARCH',   desc: 'Find all hidden words fastest',  icon: '🔍', color: 'pink',   tag: 'SEARCH'    },
  { id: 'memory',     name: 'MEMORY MATCH',  desc: 'Flip and match all card pairs',  icon: '🃏', color: 'purple', tag: 'MEMORY'    },
]

const C = {
  cyan:   { border: 'neon-border-cyan',   text: 'neon-text-cyan',   tag: 'bg-[#00f5ff11] text-[#00f5ff]' },
  green:  { border: 'neon-border-green',  text: 'neon-text-green',  tag: 'bg-[#00ff8811] text-[#00ff88]' },
  gold:   { border: 'neon-border-gold',   text: 'neon-text-gold',   tag: 'bg-[#ffd70011] text-[#ffd700]' },
  pink:   { border: 'neon-border-pink',   text: 'neon-text-pink',   tag: 'bg-[#ff006e11] text-[#ff006e]' },
  purple: { border: 'neon-border-purple', text: 'neon-text-purple', tag: 'bg-[#bf00ff11] text-[#bf00ff]' },
}

export default function Hub() {
  const { user, scores, logout } = useUser()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <p className="font-rajdhani text-gray-500 text-xs tracking-widest uppercase">Welcome back</p>
          <h2 className="font-orbitron text-lg font-bold neon-text-cyan tracking-wider">{user.username}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-orbitron text-xs text-gray-600">ARCADE</p>
            <p className="font-orbitron text-base font-black neon-text-purple">DUELS</p>
          </div>
          <button
            onClick={logout}
            className="font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            EXIT
          </button>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-arcade-cyan/20 to-transparent mx-5 mb-6" />

      <p className="font-orbitron text-xs text-gray-500 tracking-widest text-center mb-6">SELECT YOUR GAME</p>

      {/* Game Cards */}
      <div className="px-4 flex flex-col gap-3">
        {GAMES.map((game, i) => {
          const c = C[game.color]
          const s = scores[game.id]
          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className={`glass-card ${c.border} rounded-2xl p-4`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{game.icon}</span>
                  <div>
                    <span className={`text-[10px] font-rajdhani tracking-widest px-2 py-0.5 rounded ${c.tag}`}>
                      {game.tag}
                    </span>
                    <h3 className={`font-orbitron text-sm font-bold ${c.text} mt-0.5`}>{game.name}</h3>
                  </div>
                </div>
                {s && (
                  <div className="text-right">
                    <p className="font-rajdhani text-[10px] text-gray-600 tracking-wider">BEST</p>
                    <p className={`font-orbitron text-sm font-bold ${c.text}`}>{s.best}</p>
                  </div>
                )}
              </div>

              <p className="font-rajdhani text-gray-500 text-sm mb-3">{game.desc}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/game/${game.id}/solo`)}
                  className={`flex-1 py-2 rounded-lg font-orbitron text-[11px] tracking-wider
                             ${c.border} ${c.text} bg-transparent hover:bg-white/5 transition-all`}
                >
                  SOLO
                </button>
                <button
                  onClick={() => navigate(`/game/${game.id}/versus`)}
                  className="flex-1 py-2 rounded-lg font-orbitron text-[11px] tracking-wider
                             border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-all"
                >
                  VS FRIEND
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
