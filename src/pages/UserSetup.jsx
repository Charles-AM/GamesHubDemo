import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser, AVATARS } from '../context/UserContext'
import { GameIcon, Icon } from '../components/Icons'

// Geometric particle positions (static, no emoji)
const PARTICLES = [
  { shape: 'diamond', top: '8%',  left: '6%',  color: '#00f5ff', size: 8,  delay: 0    },
  { shape: 'ring',    top: '15%', left: '82%', color: '#bf00ff', size: 10, delay: 0.6  },
  { shape: 'diamond', top: '35%', left: '90%', color: '#ff006e', size: 6,  delay: 1.1  },
  { shape: 'ring',    top: '55%', left: '4%',  color: '#ffd700', size: 8,  delay: 0.3  },
  { shape: 'diamond', top: '72%', left: '88%', color: '#00ff88', size: 7,  delay: 0.8  },
  { shape: 'ring',    top: '85%', left: '12%', color: '#00f5ff', size: 9,  delay: 1.4  },
  { shape: 'diamond', top: '22%', left: '48%', color: '#bf00ff', size: 5,  delay: 0.5  },
  { shape: 'ring',    top: '65%', left: '55%', color: '#ff006e', size: 6,  delay: 1.0  },
]

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
  const navigate = useNavigate()

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

      {/* Floating geometric particles */}
      {PARTICLES.map((p, i) => (
        <motion.div key={i} className="fixed pointer-events-none"
          style={{ top: p.top, left: p.left, opacity: 0.18 }}
          animate={{ y: [0, -12, 0], rotate: p.shape === 'diamond' ? [0, 180, 360] : [0, 0, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 3.5 + i * 0.35, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}>
          {p.shape === 'diamond' ? (
            <svg width={p.size * 2} height={p.size * 2} viewBox="0 0 12 12">
              <polygon points="6,0 12,6 6,12 0,6" fill={p.color} />
            </svg>
          ) : (
            <svg width={p.size * 2} height={p.size * 2} viewBox="0 0 12 12">
              <circle cx="6" cy="6" r="4.5" fill="none" stroke={p.color} strokeWidth="1.5" />
            </svg>
          )}
        </motion.div>
      ))}

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
        className="text-center mb-5 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-1">
          {/* Neon controller icon */}
          <div style={{ filter: 'drop-shadow(0 0 8px #00f5ff)' }}>
            <Icon name="controller" size={36} color="#00f5ff" strokeWidth={1.5} />
          </div>
          <h1 className="font-orbitron text-4xl font-black tracking-wider"
            style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff, #ff006e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ARCADIA
          </h1>
        </div>
        <h2 className="font-orbitron text-xl font-bold neon-text-purple tracking-[0.5em]">DUELS</h2>
        <p className="font-rajdhani text-gray-500 mt-1 text-xs tracking-widest">10 ARCADE GAMES · BATTLE MODE · DAILY CHALLENGES</p>
      </motion.div>

      {/* Game showcase */}
      {(screen === 'signup' || screen === 'signin') && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative z-10 w-full max-w-sm mb-5">

          {/* Scrolling game tiles */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {[
              { id: 'pong',       label: 'PONG VS AI',   color: '#00f5ff' },
              { id: 'soccer',     label: 'PENALTIES',    color: '#00ff88' },
              { id: 'hoops',      label: 'HOOP SHOTS',   color: '#ff8c00' },
              { id: 'shooter',    label: 'SHOOTER',      color: '#00f5ff' },
              { id: 'runner',     label: 'RUNNER',       color: '#00ff88' },
              { id: 'fruitslash', label: 'FRUIT SLASH',  color: '#ff006e' },
              { id: 'archery',    label: 'ARCHERY',      color: '#ffd700' },
              { id: 'snake',      label: 'SNAKE',        color: '#00ff88' },
              { id: 'celeb',      label: 'WHO AM I?',    color: '#bf00ff' },
              { id: 'crossword',  label: 'CROSSWORD',    color: '#ffd700' },
              { id: 'wordsearch', label: 'WORD SEARCH',  color: '#ff006e' },
              { id: 'flags',      label: 'FLAG FRENZY',  color: '#bf00ff' },
            ].map(g => (
              <div key={g.id} className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl"
                style={{ background: `${g.color}10`, border: `1px solid ${g.color}30`, minWidth: 62 }}>
                <GameIcon id={g.id} size={20} color={g.color} strokeWidth={1.5} />
                <p className="font-orbitron text-[7px] tracking-wider text-center leading-tight"
                  style={{ color: g.color }}>{g.label}</p>
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { icon: 'controller', text: '10 GAMES',        color: '#ffd700' },
              { icon: 'check',      text: '3 DIFFICULTIES',  color: '#00ff88' },
              { icon: 'swords',     text: 'REAL-TIME BATTLE',color: '#ff006e' },
              { icon: 'refresh',    text: 'DAILY CHALLENGE', color: '#bf00ff' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: `${f.color}0f`, border: `1px solid ${f.color}33` }}>
                <Icon name={f.icon} size={10} color={f.color} strokeWidth={2} />
                <span className="font-orbitron text-[8px] tracking-widest" style={{ color: f.color }}>{f.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

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
              {loading ? 'LOADING...' : 'ENTER THE ARENA'}
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

            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="font-rajdhani text-[10px] text-gray-600">OR</span>
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <button onClick={() => navigate('/hub')}
              className="w-full py-2.5 rounded-xl font-orbitron text-xs tracking-widest transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', color: '#9ca3af' }}>
              PLAY AS GUEST →
            </button>
            <p className="font-rajdhani text-[10px] text-gray-700 text-center mt-1.5">
              Scores won't be saved · Battle mode requires an account
            </p>
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
              {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
            </motion.button>

            <button onClick={() => { setScreen('signin'); setError('') }}
              className="w-full py-2 font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
              ← BACK TO SIGN IN
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="font-rajdhani text-[10px] text-gray-600">OR</span>
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <button onClick={() => navigate('/hub')}
              className="w-full py-2.5 rounded-xl font-orbitron text-xs tracking-widest transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', color: '#9ca3af' }}>
              PLAY AS GUEST →
            </button>
            <p className="font-rajdhani text-[10px] text-gray-700 text-center mt-1.5">
              Scores won't be saved · Battle mode requires an account
            </p>
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
                      background: avatar === a ? 'rgba(0,245,255,0.2)' : 'var(--surf-2)',
                      border: `1px solid ${avatar === a ? 'rgba(0,245,255,0.6)' : 'var(--bdr-1)'}`,
                      transform: avatar === a ? 'scale(1.15)' : 'scale(1)',
                    }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview + name */}
            <div className="flex items-center gap-4 mb-4 p-3 rounded-2xl"
              style={{ background: 'var(--surf-1)', border: '1px solid var(--bdr-2)' }}>
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
              {loading ? 'SAVING...' : 'ENTER THE ARENA'}
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

            <motion.div animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex justify-center mb-5"
              style={{ filter: 'drop-shadow(0 0 12px #00f5ff)' }}>
              <Icon name="share" size={52} color="#00f5ff" strokeWidth={1.2} />
            </motion.div>

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
              {loading ? 'SENDING...' : 'SEND RESET LINK'}
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

            <div className="flex justify-center mb-4" style={{ filter: 'drop-shadow(0 0 10px #00f5ff)' }}>
              <Icon name="share" size={44} color="#00f5ff" strokeWidth={1.2} />
            </div>
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
              <div className="flex justify-center mb-2" style={{ filter: 'drop-shadow(0 0 10px #00f5ff)' }}>
                <Icon name="key" size={36} color="#00f5ff" strokeWidth={1.5} />
              </div>
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
              {loading ? 'SAVING...' : 'SAVE NEW PASSWORD'}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
