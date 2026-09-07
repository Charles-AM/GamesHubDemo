import { motion } from 'framer-motion'
import { Icon } from './Icons'

const C = {
  cyan:   { neon: 'neon-text-cyan',   border: '1px solid rgba(0,245,255,0.4)',   color: '#00f5ff' },
  green:  { neon: 'neon-text-green',  border: '1px solid rgba(0,255,136,0.4)',   color: '#00ff88' },
  gold:   { neon: 'neon-text-gold',   border: '1px solid rgba(255,215,0,0.4)',   color: '#ffd700' },
  pink:   { neon: 'neon-text-pink',   border: '1px solid rgba(255,0,110,0.4)',   color: '#ff006e' },
  purple: { neon: 'neon-text-purple', border: '1px solid rgba(191,0,255,0.4)',   color: '#bf00ff' },
}

const OUTCOMES = {
  win:  { label: 'VICTORY',  cls: 'neon-text-green', color: '#00ff88' },
  lose: { label: 'DEFEATED', cls: 'neon-text-pink',  color: '#ff006e' },
  draw: { label: 'DRAW',     cls: 'neon-text-gold',  color: '#ffd700' },
}

export default function ResultScreen({
  game, score, stats = [], outcome, shareText,
  onPlayAgain, onHub,
  color = 'cyan',
}) {
  const c = C[color] || C.cyan
  const o = outcome ? OUTCOMES[outcome] : null

  const handleShare = () => {
    const txt = shareText || `I scored ${score} in ${game} on ArcadiaDuels! Can you beat it?`
    navigator.clipboard?.writeText(txt).catch(() => {})
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }} className="w-full max-w-sm">

        <p className="font-orbitron text-[10px] text-gray-500 tracking-widest text-center mb-3">{game}</p>

        {o && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="flex items-center justify-center gap-2 mb-5">
            {outcome === 'win' && (
              <Icon name="trophy" size={28} color={o.color} strokeWidth={1.5} />
            )}
            <p className={`font-orbitron text-4xl font-black ${o.cls}`}>{o.label}</p>
          </motion.div>
        )}

        {/* Score */}
        <div className="glass-card rounded-2xl p-6 text-center mb-4" style={{ border: c.border }}>
          <p className="font-rajdhani text-gray-500 text-xs tracking-widest mb-1">FINAL SCORE</p>
          <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, type: 'spring' }}
            className={`font-orbitron text-5xl font-black ${c.neon}`}>
            {score}
          </motion.p>
        </div>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="glass-card rounded-2xl p-4 mb-4 flex justify-around border border-gray-800">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="font-orbitron text-[10px] text-gray-600 tracking-wider">{s.label}</p>
                <p className={`font-orbitron text-lg font-bold ${c.neon}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Share */}
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.95 }} onClick={handleShare}
          className="w-full py-2 rounded-xl font-orbitron text-[10px] tracking-widest mb-4 transition-all
                     flex items-center justify-center gap-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#555' }}>
          <Icon name="share" size={12} color="#555" />
          COPY SCORE TO SHARE
        </motion.button>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} onClick={onPlayAgain}
            className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest transition-all"
            style={{ background: `${c.color}12`, border: c.border, color: c.color }}>
            PLAY AGAIN
          </motion.button>
          <button onClick={onHub}
            className="w-full py-3 rounded-xl font-orbitron text-xs tracking-widest
                       border border-gray-800 text-gray-600 hover:text-gray-400 transition-all">
            BACK TO HUB
          </button>
        </div>
      </motion.div>
    </div>
  )
}
