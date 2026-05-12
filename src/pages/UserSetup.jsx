import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser, AVATARS } from '../context/UserContext'

const FLOATERS = ['🎮','🕹️','⚡','🏆','🎯','🌟','🔥','💥','🎲','👾']

export default function UserSetup() {
  const { signIn, signUp, createProfile, needsProfile } = useUser()

  // If authenticated but no profile yet → go straight to profile setup
  const [screen, setScreen] = useState(needsProfile ? 'profile' : 'signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [avatar,   setAvatar]   = useState(AVATARS[0])
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Keep screen in sync if needsProfile changes from outside
  if (needsProfile && screen !== 'profile') setScreen('profile')

  const handleSignIn = async () => {
    setError('')
    if (!email.trim() || !password)  { setError('Enter email and password'); return }
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      // auth state listener handles the rest
    } catch (e) {
      setError(e.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setError('')
    if (!email.trim())    { setError('Enter your email'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await signUp(email.trim(), password)
      setScreen('profile') // next: pick username + avatar
    } catch (e) {
      setError(e.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProfile = async () => {
    setError('')
    const name = username.trim()
    if (name.length < 2)  { setError('Min 2 characters'); return }
    if (name.length > 16) { setError('Max 16 characters'); return }
    setLoading(true)
    try {
      await createProfile(name, avatar)
      // context will flip needsProfile → false and App routes to /hub
    } catch (e) {
      if (e.message?.includes('unique')) setError('That username is taken — try another')
      else setError(e.message || 'Could not save profile')
    } finally {
      setLoading(false)
    }
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

        {/* ── Sign In ── */}
        {screen === 'signin' && (
          <motion.div key="signin" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }} className="relative z-10 w-full max-w-sm">

            <p className="font-orbitron text-xs text-gray-400 tracking-widest text-center mb-5">
              ✦ SIGN IN ✦
            </p>

            <div className="glass-card rounded-2xl p-5 mb-4"
              style={{ border: '1px solid rgba(0,245,255,0.15)' }}>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                placeholder="EMAIL" autoComplete="email"
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 mb-3
                           font-orbitron text-xs text-white placeholder-gray-700 tracking-wider
                           focus:outline-none focus:border-arcade-cyan transition-all" />
              <input type="password" value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                placeholder="PASSWORD" autoComplete="current-password"
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3
                           font-orbitron text-xs text-white placeholder-gray-700 tracking-wider
                           focus:outline-none focus:border-arcade-cyan transition-all" />
            </div>

            {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-3">{error}</p>}

            <motion.button whileTap={{ scale: 0.96 }} onClick={handleSignIn} disabled={loading}
              className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold mb-3 transition-all"
              style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid #00f5ff', color: loading ? '#555' : '#00f5ff' }}>
              {loading ? 'LOADING...' : '⚡ ENTER THE ARENA'}
            </motion.button>

            <button onClick={() => { setScreen('signup'); setError('') }}
              className="w-full py-2 font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
              No account? CREATE ONE →
            </button>
          </motion.div>
        )}

        {/* ── Sign Up ── */}
        {screen === 'signup' && (
          <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} className="relative z-10 w-full max-w-sm">

            <p className="font-orbitron text-xs text-gray-400 tracking-widest text-center mb-5">
              ✦ CREATE ACCOUNT ✦
            </p>

            <div className="glass-card rounded-2xl p-5 mb-4"
              style={{ border: '1px solid rgba(191,0,255,0.15)' }}>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="EMAIL" autoComplete="email"
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 mb-3
                           font-orbitron text-xs text-white placeholder-gray-700 tracking-wider
                           focus:outline-none focus:border-arcade-purple transition-all" />
              <input type="password" value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSignUp()}
                placeholder="PASSWORD (min 6 chars)" autoComplete="new-password"
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3
                           font-orbitron text-xs text-white placeholder-gray-700 tracking-wider
                           focus:outline-none focus:border-arcade-purple transition-all" />
            </div>

            {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-3">{error}</p>}

            <motion.button whileTap={{ scale: 0.96 }} onClick={handleSignUp} disabled={loading}
              className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold mb-3"
              style={{ background: 'rgba(191,0,255,0.1)', border: '1px solid #bf00ff', color: loading ? '#555' : '#bf00ff' }}>
              {loading ? 'CREATING...' : '🚀 CREATE ACCOUNT'}
            </motion.button>

            <button onClick={() => { setScreen('signin'); setError('') }}
              className="w-full py-2 font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
              ← BACK TO SIGN IN
            </button>
          </motion.div>
        )}

        {/* ── Profile setup (after signup, or if needsProfile) ── */}
        {screen === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="relative z-10 w-full max-w-sm">

            <p className="font-orbitron text-xs text-gray-400 tracking-widest text-center mb-5">
              ✦ SET UP YOUR PROFILE ✦
            </p>

            {/* Avatar picker */}
            <div className="glass-card rounded-2xl p-4 mb-4"
              style={{ border: '1px solid rgba(0,245,255,0.2)' }}>
              <p className="font-orbitron text-[10px] text-gray-500 tracking-widest text-center mb-3">CHOOSE YOUR AVATAR</p>
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

            {/* Preview + name */}
            <div className="flex items-center gap-4 mb-4 p-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                style={{ background: 'rgba(0,245,255,0.08)', border: '2px solid rgba(0,245,255,0.3)' }}>
                {avatar}
              </div>
              <input type="text" value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleCreateProfile()}
                placeholder="YOUR CALLSIGN" maxLength={16}
                className="flex-1 bg-transparent border border-gray-700 rounded-xl px-3 py-2.5
                           font-orbitron text-sm text-white placeholder-gray-700 tracking-widest
                           focus:outline-none focus:border-arcade-cyan transition-all" />
            </div>

            {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-3">{error}</p>}

            <motion.button whileTap={{ scale: 0.96 }} onClick={handleCreateProfile} disabled={loading}
              className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold"
              style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid #00f5ff', color: loading ? '#555' : '#00f5ff', boxShadow: '0 0 20px rgba(0,245,255,0.15)' }}>
              {loading ? 'SAVING...' : '⚡ ENTER THE ARENA'}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
