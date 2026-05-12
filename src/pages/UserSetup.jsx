import { useState } from 'react'
import { motion } from 'framer-motion'
import { useUser } from '../context/UserContext'

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-14"
      >
        <h1 className="font-orbitron text-6xl font-black neon-text-cyan tracking-widest">ARCADIA</h1>
        <h2 className="font-orbitron text-4xl font-bold neon-text-purple tracking-[0.3em] mt-1">DUELS</h2>
        <p className="font-rajdhani text-gray-500 mt-4 text-lg tracking-widest uppercase">
          5 Games · Solo · Head-to-Head
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="glass-card neon-border-cyan rounded-2xl p-8 w-full max-w-sm"
      >
        <p className="font-orbitron text-xs text-gray-400 tracking-widest text-center mb-6">
          ENTER YOUR CALLSIGN
        </p>

        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          placeholder="PLAYER_ONE"
          maxLength={16}
          className="w-full bg-transparent border border-arcade-cyan/20 rounded-lg px-4 py-3
                     font-orbitron text-sm text-white placeholder-gray-700 text-center tracking-widest
                     focus:outline-none focus:border-arcade-cyan transition-all duration-300"
        />

        {error && <p className="text-arcade-pink text-xs font-rajdhani mt-2 text-center">{error}</p>}

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleStart}
          className="w-full mt-5 py-3 rounded-lg font-orbitron text-arcade-cyan text-sm tracking-widest
                     neon-border-cyan bg-arcade-cyan/10 hover:bg-arcade-cyan/20 transition-all duration-300"
        >
          ENTER THE ARENA
        </motion.button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="font-rajdhani text-gray-600 text-sm mt-8 tracking-widest"
      >
        SOLO · HEAD-TO-HEAD · MULTIPLAYER
      </motion.p>
    </div>
  )
}
