import { motion } from 'framer-motion'

const TIERS = [
  {
    key:   'easy',
    icon:  '🌱',
    label: 'ROOKIE',
    badge: 'PERFECT FOR KIDS',
    desc:  'More time · simpler challenges · chill vibes',
    color: '#00ff88',
    glow:  'rgba(0,255,136,0.18)',
    border:'rgba(0,255,136,0.45)',
  },
  {
    key:   'medium',
    icon:  '⚡',
    label: 'CHALLENGER',
    badge: 'RECOMMENDED',
    desc:  'Balanced difficulty · the classic experience',
    color: '#ffd700',
    glow:  'rgba(255,215,0,0.18)',
    border:'rgba(255,215,0,0.45)',
  },
  {
    key:   'hard',
    icon:  '💀',
    label: 'VETERAN',
    badge: 'NO MERCY',
    desc:  'Less time · harder content · for the brave',
    color: '#ff006e',
    glow:  'rgba(255,0,110,0.18)',
    border:'rgba(255,0,110,0.45)',
  },
]

export default function DifficultyPicker({ game, onSelect }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-5%',  left: '-10%' }} />
        <div className="orb orb-purple" style={{ bottom: '5%', right: '-8%' }} />
      </div>

      {/* Game identity */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 relative z-10">
        <div className="text-5xl mb-2">{game.icon}</div>
        <p className="font-orbitron text-xs text-gray-500 tracking-widest mb-1">{game.label}</p>
        <h2 className="font-orbitron text-xl font-black text-white">SELECT DIFFICULTY</h2>
      </motion.div>

      {/* Tier cards */}
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-3">
        {TIERS.map((tier, i) => (
          <motion.button
            key={tier.key}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 200, damping: 22 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(tier.key)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all"
            style={{
              background: `linear-gradient(135deg, ${tier.glow}, rgba(255,255,255,0.02))`,
              border: `1px solid ${tier.border}`,
              boxShadow: `0 4px 24px ${tier.glow}`,
            }}>

            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: `${tier.color}18`, border: `1px solid ${tier.color}44` }}>
              {tier.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-orbitron text-sm font-black" style={{ color: tier.color }}>
                  {tier.label}
                </p>
                <span className="font-orbitron text-[8px] px-2 py-0.5 rounded-full"
                  style={{ background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}44` }}>
                  {tier.badge}
                </span>
              </div>
              <p className="font-rajdhani text-xs text-gray-400">{tier.desc}</p>
            </div>

            {/* Arrow */}
            <span className="font-orbitron text-lg flex-shrink-0" style={{ color: tier.color }}>›</span>
          </motion.button>
        ))}
      </div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="font-rajdhani text-[10px] text-gray-700 tracking-widest mt-6 relative z-10">
        DIFFICULTY AFFECTS SPEED · WORD LENGTH · TIME LIMITS
      </motion.p>
    </div>
  )
}
