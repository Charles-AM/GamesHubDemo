import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser, AVATARS } from '../context/UserContext'

const FLOATERS = ['🎮','🕹️','⚡','🏆','🎯','🌟','🔥','💥','🎲','👾']

// Rate limiting helpers — outside component so they don't recreate on every render
const LIMIT_KEY        = 'arcadia_signin_attempts'
const getLimitData     = () => JSON.parse(sessionStorage.getItem(LIMIT_KEY) || '{"count":0,"lockedUntil":0}')
const isLocked         = () => getLimitData().lockedUntil > Date.now()
const lockSecondsLeft  = () => Math.ceil((getLimitData().lockedUntil - Date.now()) / 1000)
const clearAttempts    = () => sessionStorage.removeItem(LIMIT_KEY)
const recordFailedAttempt = () => {
  const d     = getLimitData()
  const count = d.count + 1
  const lockedUntil = count >= 5 ? Date.now() + 15 * 60 * 1000 : 0
  sessionStorage.setItem(LIMIT_KEY, JSON.stringify({ count, lockedUntil }))
  return count
}

export default function UserSetup() {
  const { signIn, signUp, signOut, createProfile, needsProfile,
          sendPasswordReset, updatePassword, isPasswordRecovery } = useUser()

  const [screen,   setScreen]   = useState(
    (isPasswordRecovery || sessionStorage.getItem('arcadia_recovery') === '1')
      ? 'new-password'
      : needsProfile ? 'profile' : 'signup'
  )
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [newPass,  setNewPass]  = useState('')
  const [username, setUsername] = useState('')
  const [avatar,   setAvatar]   = useState(AVATARS[0])
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Keep screen in sync when context flags change (must be in useEffect, not render)
  useEffect(() => {
    if (isPasswordRecovery) setScreen('new-password')
    else if (needsProfile) setScreen('profile')
  }, [isPasswordRecovery, needsProfile])

  const handleSignIn = async () => {
    setError('')
    if (isLocked()) { setError(`Too many attempts. Try again in ${lockSecondsLeft()}s`); return }
    if (!email.trim() || !password) { setError('Enter email and password'); return }
    setLoading(true)
    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Request timed out — check your connection')), 10000))
      await Promise.race([signIn(email.trim(), password), timeout])
      clearAttempts()
    } catch (e) {
      if (e.message?.includes('timed out')) {
        setError('Connection timed out — please try again')
      } else if (e.message?.includes('Email not confirmed')) {
        setError('Please confirm your email first — check your inbox')
      } else {
        const attempts = recordFailedAttempt()
        if (attempts >= 5) setError('Too many failed attempts. Locked for 15 minutes.')
        else setError(`Incorrect email or password (${5 - attempts} attempts left)`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setError('')
    if (!email.trim())       { setError('Enter your email'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await signUp(email.trim(), password)
      setScreen('confirm-email') // wait for email confirmation
    } catch (e) {
      setError(e.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    setError('')
    if (!email.trim()) { setError('Enter your email address'); return }
    setLoading(true)
    try {
      await sendPasswordReset(email.trim())
      setScreen('reset-sent')
    } catch (e) {
      setError(e.message || 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleNewPassword = async () => {
    setError('')
    if (newPass.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))
      await Promise.race([updatePassword(newPass), timeout])
    } catch (e) {
      if (e.message === 'timeout') setError('Connection timed out — please try again')
      else setError(e.message || 'Could not update password')
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
      if (e.message?.includes('unique')) {
        setError('That username is taken — try another')
      } else if (e.message?.includes('foreign key') || e.message?.includes('violates') || e.message?.includes('not authenticated')) {
        // Broken/stale session — sign out so they can start fresh
        await signOut()
      } else {
        setError(e.message || 'Could not save profile')
      }
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

            <div className="flex justify-between">
              <button onClick={() => { setScreen('forgot'); setError('') }}
                className="font-orbitron text-[10px] text-gray-600 hover:text-gray-400 transition-colors py-2">
                Forgot password?
              </button>
              <button onClick={() => { setScreen('signup'); setError('') }}
                className="font-orbitron text-[10px] hover:text-gray-400 transition-colors py-2"
                style={{ color: '#bf00ff' }}>
                No account? CREATE →
              </button>
            </div>
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

            <button onClick={() => signOut()}
              className="w-full mt-3 py-2 rounded-xl font-orbitron text-[10px] tracking-widest transition-colors"
              style={{ border: '1px solid rgba(255,0,110,0.4)', color: '#ff006e' }}>
              ← SIGN OUT / USE DIFFERENT ACCOUNT
            </button>
          </motion.div>
        )}

        {/* ── Confirm email (after sign up) ── */}
        {screen === 'confirm-email' && (
          <motion.div key="confirm-email" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-sm text-center">

            <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-6xl mb-5">📨</motion.div>

            <h2 className="font-orbitron text-lg font-black neon-text-cyan mb-2">CHECK YOUR INBOX</h2>
            <p className="font-rajdhani text-sm text-gray-400 mb-2">
              A confirmation link has been sent to
            </p>
            <p className="font-orbitron text-xs mb-4" style={{ color: '#00f5ff' }}>{email}</p>

            <div className="glass-card rounded-2xl p-4 mb-6 text-left"
              style={{ border: '1px solid rgba(0,245,255,0.15)' }}>
              {[
                '1. Open the email from Arcadia Duels',
                '2. Click "Confirm your email"',
                '3. You\'ll be brought back here',
                '4. Pick your avatar & callsign',
              ].map((step, i) => (
                <p key={i} className="font-rajdhani text-xs text-gray-400 py-1">{step}</p>
              ))}
            </div>

            <p className="font-rajdhani text-xs text-gray-600 mb-4">
              Can't find it? Check your spam folder.
            </p>

            <button onClick={() => { setScreen('signup'); setError('') }}
              className="w-full py-3 rounded-xl font-orbitron text-xs text-gray-500 border border-gray-800 hover:text-gray-300 transition-all">
              ← USE A DIFFERENT EMAIL
            </button>
          </motion.div>
        )}

        {/* ── Forgot password ── */}
        {screen === 'forgot' && (
          <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} className="relative z-10 w-full max-w-sm">

            <p className="font-orbitron text-xs text-gray-400 tracking-widest text-center mb-2">
              ✦ RESET PASSWORD ✦
            </p>
            <p className="font-rajdhani text-xs text-gray-500 text-center mb-5">
              Enter your email and we'll send you a reset link
            </p>

            <div className="glass-card rounded-2xl p-5 mb-4"
              style={{ border: '1px solid rgba(0,245,255,0.15)' }}>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleForgot()}
                placeholder="YOUR EMAIL" autoComplete="email"
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3
                           font-orbitron text-xs text-white placeholder-gray-700 tracking-wider
                           focus:outline-none focus:border-arcade-cyan transition-all" />
            </div>

            {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-3">{error}</p>}

            <motion.button whileTap={{ scale: 0.96 }} onClick={handleForgot} disabled={loading}
              className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold mb-3"
              style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid #00f5ff', color: loading ? '#555' : '#00f5ff' }}>
              {loading ? 'SENDING...' : '📧 SEND RESET LINK'}
            </motion.button>

            <button onClick={() => { setScreen('signin'); setError('') }}
              className="w-full py-2 font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
              ← BACK TO SIGN IN
            </button>
          </motion.div>
        )}

        {/* ── Reset email sent ── */}
        {screen === 'reset-sent' && (
          <motion.div key="reset-sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-sm text-center">

            <div className="text-5xl mb-4">📬</div>
            <h2 className="font-orbitron text-lg font-black neon-text-cyan mb-2">CHECK YOUR EMAIL</h2>
            <p className="font-rajdhani text-sm text-gray-400 mb-2">
              A password reset link has been sent to
            </p>
            <p className="font-orbitron text-xs mb-6" style={{ color: '#00f5ff' }}>{email}</p>
            <p className="font-rajdhani text-xs text-gray-600 mb-6">
              Click the link in the email — it'll bring you back here to set a new password.
            </p>

            <button onClick={() => { setScreen('signin'); setError('') }}
              className="w-full py-3 rounded-xl font-orbitron text-xs text-gray-500 border border-gray-800 hover:text-gray-300 transition-all">
              ← BACK TO SIGN IN
            </button>
          </motion.div>
        )}

        {/* ── Set new password (after clicking reset link) ── */}
        {screen === 'new-password' && (
          <motion.div key="new-password" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-sm">

            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🔐</div>
              <p className="font-orbitron text-xs text-gray-400 tracking-widest">✦ SET NEW PASSWORD ✦</p>
            </div>

            <div className="glass-card rounded-2xl p-5 mb-4"
              style={{ border: '1px solid rgba(0,245,255,0.2)' }}>
              <input type="password" value={newPass}
                onChange={e => { setNewPass(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleNewPassword()}
                placeholder="NEW PASSWORD (min 6 chars)" autoComplete="new-password"
                className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3
                           font-orbitron text-xs text-white placeholder-gray-700 tracking-wider
                           focus:outline-none focus:border-arcade-cyan transition-all" />
            </div>

            {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-3">{error}</p>}

            <motion.button whileTap={{ scale: 0.96 }} onClick={handleNewPassword} disabled={loading}
              className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest font-bold"
              style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid #00f5ff', color: loading ? '#555' : '#00f5ff', boxShadow: '0 0 20px rgba(0,245,255,0.15)' }}>
              {loading ? 'SAVING...' : '⚡ SAVE NEW PASSWORD'}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
