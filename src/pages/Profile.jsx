import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, getLevel, getLevelPct, getXpToNext, XP_PER_LEVEL } from '../context/UserContext'
import { GAME_LIST } from '../games/gameRegistry'

function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const MODE_LABEL = { solo: '▶ SOLO', versus: '⚔ VS', daily: '📅 DAILY' }
const GAME_ICON  = { mathblitz: '⚡', wordle: '🔤', crossword: '✏️', wordsearch: '🔍', flags: '🌍', snake: '🐍' }
const GAME_NAME  = { mathblitz: 'MATH BLITZ', wordle: 'WORDLE', crossword: 'CROSSWORD', wordsearch: 'WORD SEARCH', flags: 'FLAGS', snake: 'SNAKE' }

export default function Profile() {
  const { user, scores, matchHistory, deleteAccount, signOut } = useUser()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInput,     setDeleteInput]     = useState('')
  const [deleteLoading,   setDeleteLoading]   = useState(false)
  const [deleteError,     setDeleteError]     = useState('')

  if (!user) { navigate('/'); return null }

  const handleDelete = async () => {
    if (deleteInput !== 'DELETE') { setDeleteError('Type DELETE to confirm'); return }
    setDeleteLoading(true)
    try {
      await deleteAccount()
      navigate('/')
    } catch (e) {
      setDeleteError(e.message || 'Could not delete account')
      setDeleteLoading(false)
    }
  }

  const xp        = user.xp || 0
  const level     = getLevel(xp)
  const pct       = getLevelPct(xp)
  const toNext    = getXpToNext(xp)
  const joinDate  = new Date(user.joinedAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })
  const totalPlays  = Object.values(scores).reduce((a, s) => a + (s.plays || 0), 0)
  const totalWins   = matchHistory.filter(m => m.mode === 'versus' && m.won === true).length
  const totalLoss   = matchHistory.filter(m => m.mode === 'versus' && m.won === false).length
  const winRate     = totalWins + totalLoss > 0 ? Math.round((totalWins / (totalWins + totalLoss)) * 100) : 0

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 relative overflow-hidden">

      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-5%',  left: '-10%' }} />
        <div className="orb orb-purple" style={{ bottom: '10%', right: '-8%' }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <p className="font-orbitron text-xs text-gray-500 tracking-widest">PROFILE</p>
      </div>

      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 rounded-3xl p-6 text-center mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(0,245,255,0.08), rgba(191,0,255,0.08))',
          border: '1px solid rgba(0,245,255,0.2)',
        }}>

        {/* Avatar */}
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-3"
          style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(0,245,255,0.3)' }}>
          {user.avatar}
        </div>

        <div className="flex items-center justify-center gap-2 mb-1">
          <h2 className="font-orbitron text-lg font-black text-white">{user.username}</h2>
          <span className="font-orbitron text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,245,255,0.15)', color: '#00f5ff', border: '1px solid rgba(0,245,255,0.3)' }}>
            LV.{level}
          </span>
        </div>

        <p className="font-rajdhani text-xs text-gray-500 mb-3">Joined {joinDate}</p>

        {/* XP bar */}
        <div className="h-2 bg-gray-800 rounded-full mb-1.5 overflow-hidden max-w-xs mx-auto">
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #00f5ff, #bf00ff)' }}
            initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
        </div>
        <p className="font-rajdhani text-[10px] text-gray-500">{xp} XP · {toNext} to next level</p>

        {/* Streak */}
        {user.streak?.count > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)' }}>
            <span className="text-sm">🔥</span>
            <span className="font-orbitron text-[10px]" style={{ color: '#ffd700' }}>{user.streak.count} DAY STREAK</span>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: 'PLAYED',   value: totalPlays, color: '#00f5ff' },
            { label: 'WINS',     value: totalWins,  color: '#00ff88' },
            { label: 'LOSSES',   value: totalLoss,  color: '#ff006e' },
            { label: 'WIN RATE', value: `${winRate}%`, color: '#ffd700' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-orbitron text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="font-rajdhani text-[9px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Game Stats ── */}
      <div className="relative z-10 mb-5">
        <SectionTitle text="GAME STATS" />
        <div className="flex flex-col gap-2">
          {GAME_LIST.map((g, i) => {
            const s = scores[g.id]
            return (
              <motion.div key={g.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: s ? g.gradient : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${s ? g.border : 'rgba(255,255,255,0.06)'}`,
                }}>
                <span className="text-2xl">{g.icon}</span>
                <div className="flex-1">
                  <p className="font-orbitron text-xs font-bold" style={{ color: s ? g.color : '#444' }}>{g.label}</p>
                  {s ? (
                    <p className="font-rajdhani text-[10px] text-gray-500">{s.plays} played · best {s.best}</p>
                  ) : (
                    <p className="font-rajdhani text-[10px] text-gray-600">Not played yet</p>
                  )}
                </div>
                {s && (
                  <div className="text-right">
                    <p className="font-orbitron text-lg font-black" style={{ color: g.color }}>{s.best}</p>
                    <p className="font-rajdhani text-[9px] text-gray-500">BEST</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Match History ── */}
      {/* ── Sign out ── */}
      <div className="relative z-10 mb-4">
        <button onClick={signOut}
          className="w-full py-3 rounded-xl font-orbitron text-xs tracking-widest transition-all"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#666' }}>
          SIGN OUT
        </button>
      </div>

      {matchHistory.length > 0 && (
        <div className="relative z-10">
          <SectionTitle text="MATCH HISTORY" />
          <div className="flex flex-col gap-2">
            {matchHistory.slice(0, 15).map((m, i) => {
              const gIcon = GAME_ICON[m.game] || '🎮'
              const gName = GAME_NAME[m.game] || m.game
              const modeLabel = MODE_LABEL[m.mode] || m.mode
              const isWin  = m.mode === 'versus' && m.won === true
              const isLoss = m.mode === 'versus' && m.won === false
              const dotCol = isWin ? '#00ff88' : isLoss ? '#ff006e' : m.isDaily ? '#ffd700' : '#555'

              return (
                <motion.div key={m.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotCol, boxShadow: `0 0 5px ${dotCol}` }} />
                  <span className="text-base">{gIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-orbitron text-[10px] text-gray-400">{gName}</p>
                      <span className="font-rajdhani text-[9px] text-gray-600">{modeLabel}</span>
                    </div>
                    {m.mode === 'versus' && m.p2Name && (
                      <p className="font-rajdhani text-[10px] text-gray-500 truncate">
                        vs {m.p2Name}{m.p2Score != null ? ` · ${m.score} : ${m.p2Score}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-orbitron text-sm font-bold" style={{ color: dotCol }}>{m.score}</p>
                    <p className="font-rajdhani text-[9px] text-gray-600">{timeAgo(m.date)}</p>
                  </div>
                  <p className="font-orbitron text-[9px] flex-shrink-0" style={{ color: '#00f5ff' }}>+{m.xpEarned}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Danger zone ── */}
      <div className="relative z-10 mt-4 mb-2">
        <div className="rounded-2xl p-4" style={{ border: '1px solid rgba(255,0,110,0.2)', background: 'rgba(255,0,110,0.04)' }}>
          <p className="font-orbitron text-[10px] text-gray-600 tracking-widest mb-3">DANGER ZONE</p>
          <button onClick={() => { setShowDeleteModal(true); setDeleteInput(''); setDeleteError('') }}
            className="w-full py-2.5 rounded-xl font-orbitron text-xs tracking-widest transition-all"
            style={{ background: 'rgba(255,0,110,0.08)', border: '1px solid rgba(255,0,110,0.3)', color: '#ff006e' }}>
            🗑 DELETE ACCOUNT
          </button>
          <p className="font-rajdhani text-[10px] text-gray-700 text-center mt-2">
            Permanently removes all your data
          </p>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteModal
            input={deleteInput}
            setInput={setDeleteInput}
            error={deleteError}
            loading={deleteLoading}
            onConfirm={handleDelete}
            onClose={() => setShowDeleteModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function DeleteModal({ input, setInput, error, loading, onConfirm, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: 'rgba(12,12,30,0.98)', border: '1px solid rgba(255,0,110,0.4)' }}>

        <div className="text-3xl text-center mb-3">⚠️</div>
        <h3 className="font-orbitron text-base font-black text-center neon-text-pink mb-2">
          DELETE ACCOUNT
        </h3>
        <p className="font-rajdhani text-sm text-gray-400 text-center mb-4 leading-relaxed">
          This permanently deletes your profile, scores, and match history.
          <span className="text-white font-bold"> This cannot be undone.</span>
        </p>

        <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-2">
          TYPE <span className="text-arcade-pink">DELETE</span> TO CONFIRM
        </p>
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="DELETE" autoCapitalize="characters"
          className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 mb-3
                     font-orbitron text-sm text-white placeholder-gray-700 tracking-widest
                     focus:outline-none focus:border-arcade-pink transition-all" />

        {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-3">{error}</p>}

        <motion.button whileTap={{ scale: 0.96 }} onClick={onConfirm} disabled={loading}
          className="w-full py-3 rounded-xl font-orbitron text-sm font-bold tracking-widest mb-2"
          style={{
            background: input === 'DELETE' ? 'rgba(255,0,110,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${input === 'DELETE' ? '#ff006e' : 'rgba(255,255,255,0.1)'}`,
            color: input === 'DELETE' ? '#ff006e' : '#444',
          }}>
          {loading ? 'DELETING...' : '🗑 DELETE MY ACCOUNT'}
        </motion.button>

        <button onClick={onClose}
          className="w-full py-2 font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
          CANCEL
        </button>
      </motion.div>
    </motion.div>
  )
}

function SectionTitle({ text }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">{text}</p>
      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}
