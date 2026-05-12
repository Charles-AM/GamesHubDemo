import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser, AVATARS } from '../context/UserContext'

const FLOATERS = ['🎮','🕹️','⚡','🏆','🎯','🌟','🔥','💥','🎲','👾']

export default function UserSetup() {
  const { allUsers, createUser, loginAs } = useUser()
  const existingUsers = Object.values(allUsers)
  const [screen, setScreen] = useState(existingUsers.length > 0 ? 'pick' : 'create')
  const [username, setUsername] = useState('')
  const [avatar, setAvatar]   = useState(AVATARS[0])
  const [error, setError]     = useState('')

  const handleCreate = () => {
    const name = username.trim()
    if (name.length < 2)  return setError('Min 2 characters')
    if (name.length > 16) return setError('Max 16 characters')
    const taken = existingUsers.some(u => u.username.toLowerCase() === name.toLowerCase())
    if (taken) return setError('Name already taken on this device')
    createUser(name, avatar)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">

      {/* Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '5%',    left: '-5%'  }} />
        <div className="orb orb-purple" style={{ bottom: '5%', right: '-5%' }} />
        <div className="orb orb-pink"   style={{ top: '50%',   left: '40%'  }} />
      </div>

      {/* Floating emojis */}
      {FLOATERS.map((e, i) => (
        <motion.div key={i} className="fixed text-2xl opacity-15 pointer-events-none select-none"
          style={{ top: `${10 + (i * 9) % 78}%`, left: `${(i * 13) % 88}%` }}
          animate={{ y: [0, -14, 0], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}>
          {e}
        </motion.div>
      ))}

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-1">
          <span className="text-4xl">🕹️</span>
          <h1 className="font-orbitron text-4xl font-black tracking-wider"
            style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff, #ff006e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ARCADIA
          </h1>
        </div>
        <h2 className="font-orbitron text-xl font-bold neon-text-purple tracking-[0.5em]">DUELS</h2>
        <p className="font-rajdhani text-gray-500 mt-1 text-xs tracking-widest">5 GAMES · SOLO · HEAD-TO-HEAD</p>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── WHO'S PLAYING? (account picker) ── */}
        {screen === 'pick' && (
          <motion.div key="pick" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }} className="relative z-10 w-full max-w-sm">

            <p className="font-orbitron text-xs text-gray-400 tracking-widest text-center mb-5">
              ✦ WHO'S PLAYING? ✦
            </p>

            <div className="flex flex-col gap-3 mb-4">
              {existingUsers.map((u, i) => (
                <motion.button key={u.id}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => loginAs(u.id)}
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,245,255,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {u.avatar}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-orbitron text-sm font-bold text-white">{u.username}</p>
                    <p className="font-rajdhani text-xs text-gray-500 mt-0.5">
                      LVL {Math.floor((u.xp || 0) / 300) + 1} · {u.xp || 0} XP
                    </p>
                  </div>
                  <span className="text-gray-600 text-lg">›</span>
                </motion.button>
              ))}
            </div>

            <button onClick={() => setScreen('create')}
              className="w-full py-3 rounded-2xl font-orbitron text-xs tracking-widest transition-all"
              style={{ background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.25)', color: '#00f5ff' }}>
              + NEW PLAYER
            </button>
          </motion.div>
        )}

        {/* ── CREATE ACCOUNT ── */}
        {screen === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} className="relative z-10 w-full max-w-sm">

            <p className="font-orbitron text-xs text-gray-400 tracking-widest text-center mb-5">
              ✦ CREATE YOUR PROFILE ✦
            </p>

            {/* Avatar picker */}
            <div className="glass-card rounded-2xl p-4 mb-4"
              style={{ border: '1px solid rgba(0,245,255,0.2)' }}>
              <p className="font-orbitron text-[10px] text-gray-500 tracking-widest text-center mb-3">CHOOSE AVATAR</p>
              <div className="grid grid-cols-8 gap-2">
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setAvatar(a)}
                    className="text-2xl rounded-xl p-1.5 transition-all"
                    style={{
                      background: avatar === a ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${avatar === a ? 'rgba(0,245,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
                      transform: avatar === a ? 'scale(1.15)' : 'scale(1)',
                    }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected avatar preview */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
                style={{ background: 'rgba(0,245,255,0.1)', border: '2px solid rgba(0,245,255,0.4)' }}>
                {avatar}
              </div>
            </div>

            {/* Username */}
            <input type="text" value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="CALLSIGN" maxLength={16}
              className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 mb-2
                         font-orbitron text-sm text-white placeholder-gray-700 text-center tracking-widest
                         focus:outline-none focus:border-arcade-cyan transition-all" />

            {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-2">{error}</p>}

            <motion.button whileTap={{ scale: 0.96 }} onClick={handleCreate}
              className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold"
              style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid #00f5ff', color: '#00f5ff', boxShadow: '0 0 20px rgba(0,245,255,0.2)' }}>
              ⚡ ENTER THE ARENA
            </motion.button>

            {existingUsers.length > 0 && (
              <button onClick={() => setScreen('pick')}
                className="w-full mt-3 py-2 font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
                ← BACK
              </button>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
