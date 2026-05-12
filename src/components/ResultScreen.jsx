import { motion } from 'framer-motion'

const C = {
  cyan:   { border: 'neon-border-cyan',   text: 'neon-text-cyan'   },
  green:  { border: 'neon-border-green',  text: 'neon-text-green'  },
  gold:   { border: 'neon-border-gold',   text: 'neon-text-gold'   },
  pink:   { border: 'neon-border-pink',   text: 'neon-text-pink'   },
  purple: { border: 'neon-border-purple', text: 'neon-text-purple' },
}

const OUTCOMES = {
  win:  { label: 'VICTORY',  cls: 'neon-text-green' },
  lose: { label: 'DEFEATED', cls: 'neon-text-pink'  },
  draw: { label: 'DRAW',     cls: 'neon-text-gold'  },
}

export default function ResultScreen({ game, score, stats = [], outcome, onPlayAgain, onRematch, onHub, color = 'cyan' }) {
  const c = C[color]
  const o = outcome ? OUTCOMES[outcome] : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <p className="font-orbitron text-xs text-gray-500 tracking-widest text-center mb-4">{game}</p>

        {o && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`font-orbitron text-4xl font-black text-center mb-4 ${o.cls}`}
          >
            {o.label}
          </motion.p>
        )}

        {/* Score */}
        <div className={`glass-card ${c.border} rounded-2xl p-6 text-center mb-4`}>
          <p className="font-rajdhani text-gray-500 text-sm tracking-widest mb-1">FINAL SCORE</p>
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className={`font-orbitron text-5xl font-black ${c.text}`}
          >
            {score}
          </motion.p>
        </div>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="glass-card rounded-2xl p-4 mb-6 flex justify-around border border-gray-800">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="font-orbitron text-[10px] text-gray-600 tracking-wider">{s.label}</p>
                <p className={`font-orbitron text-lg font-bold ${c.text}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {onRematch && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={onRematch}
              className={`w-full py-3 rounded-xl font-orbitron text-sm tracking-widest
                         ${c.border} ${c.text} bg-white/5 hover:bg-white/10 transition-all`}
            >
              REMATCH
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={onPlayAgain}
            className={`w-full py-3 rounded-xl font-orbitron text-sm tracking-widest
                       ${onRematch ? 'border border-gray-700 text-gray-400 hover:text-white' : `${c.border} ${c.text} bg-white/5 hover:bg-white/10`}
                       transition-all`}
          >
            PLAY AGAIN
          </motion.button>
          <button
            onClick={onHub}
            className="w-full py-3 rounded-xl font-orbitron text-xs tracking-widest
                       border border-gray-800 text-gray-600 hover:text-gray-400 transition-all"
          >
            BACK TO HUB
          </button>
        </div>
      </motion.div>
    </div>
  )
}
