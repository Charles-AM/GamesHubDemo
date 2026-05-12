import { useState } from 'react'
import { motion } from 'framer-motion'
import { useUser } from '../context/UserContext'

const FLOATERS = ['🎮','🕹️','⚡','🏆','🎯','🌟','🔥','💥','🎲','👾']

export default function UserSetup() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const { login } = useUser()

  const handleStart = () => {
    const trimmed = username.trim()
    if (trimmed.length < 2) return setError('Min 2 characters')
    if (trimmed.length > 16) return setError('Max 16 characters')
    login(trimmed)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Colorful background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"  style={{ top: '10%',  left: '5%'  }} />
        <div className="orb orb-purple" style={{ top: '60%', right: '5%' }} />
        <div className="orb orb-pink"  style={{ bottom: '10%', left: '30%' }} />
        <div className="orb orb-green" style={{ top: '30%',  right: '20%' }} />
      </div>

      {/* Floating emoji decorations */}
      {FLOATERS.map((emoji, i) => (
        <motion.div
          key={i}
          className="fixed text-2xl select-none pointer-events-none opacity-20"
          style={{
            top: `${10 + (i * 9) % 80}%`,
            left: `${(i * 13) % 90}%`,
          }}
          animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-10 relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-4xl">🕹️</span>
          <h1 className="font-orbitron text-5xl font-black tracking-widest"
            style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff, #ff006e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ARCADIA
          </h1>
        </div>
        <h2 className="font-orbitron text-2xl font-bold neon-text-purple tracking-[0.4em]">DUELS</h2>
        <div className="flex items-center justify-center gap-2 mt-3">
          {['🧠','🔤','✏️','🔍','🃏'].map((e, i) => (
            <motion.span key={i} className="text-lg"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}>
              {e}
            </motion.span>
          ))}
        </div>
        <p className="font-rajdhani text-gray-400 mt-2 text-sm tracking-widest">5 GAMES · SOLO · HEAD-TO-HEAD</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="relative z-10 w-full max-w-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(0,245,255,0.08), rgba(191,0,255,0.08))',
          border: '1px solid rgba(0,245,255,0.3)',
          borderRadius: '1.5rem',
          padding: '2rem',
          boxShadow: '0 0 40px rgba(0,245,255,0.1), 0 0 80px rgba(191,0,255,0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <p className="font-orbitron text-xs text-gray-400 tracking-widest text-center mb-6">
          ✦ ENTER YOUR CALLSIGN ✦
        </p>

        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          placeholder="PLAYER_ONE"
          maxLength={16}
          className="w-full bg-transparent border border-arcade-cyan/20 rounded-xl px-4 py-3
                     font-orbitron text-sm text-white placeholder-gray-700 text-center tracking-widest
                     focus:outline-none focus:border-arcade-cyan transition-all duration-300"
        />

        {error && <p className="text-arcade-pink text-xs font-rajdhani mt-2 text-center">{error}</p>}

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          onClick={handleStart}
          className="w-full mt-5 py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #00f5ff22, #bf00ff22)',
            border: '1px solid #00f5ff',
            color: '#00f5ff',
            boxShadow: '0 0 20px #00f5ff33',
          }}
        >
          ⚡ ENTER THE ARENA
        </motion.button>
      </motion.div>
    </div>
  )
}
