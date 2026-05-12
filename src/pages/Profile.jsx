import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser, ACHIEVEMENTS, getLevel, getLevelPct, getXpToNext, XP_PER_LEVEL } from '../context/UserContext'
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
const GAME_ICON  = { trivia: '🧠', wordle: '🔤', crossword: '✏️', wordsearch: '🔍', flags: '🌍' }
const GAME_NAME  = { trivia: 'TRIVIA', wordle: 'WORDLE', crossword: 'CROSSWORD', wordsearch: 'WORD SEARCH', flags: 'FLAGS' }

export default function Profile() {
  const { user, scores, matchHistory, achievements } = useUser()
  const navigate = useNavigate()

  if (!user) { navigate('/'); return null }

  const xp        = user.xp || 0
  const level     = getLevel(xp)
  const pct       = getLevelPct(xp)
  const toNext    = getXpToNext(xp)
  const joinDate  = new Date(user.joinedAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })
  const totalPlays = Object.values(scores).reduce((a, s) => a + s.plays, 0)
  const totalWins  = Object.values(scores).reduce((a, s) => a + (s.wins  || 0), 0)
  const totalLoss  = Object.values(scores).reduce((a, s) => a + (s.losses || 0), 0)
  const achievSet  = new Set(achievements)

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
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: 'PLAYED', value: totalPlays, color: '#00f5ff' },
            { label: 'VS WINS', value: totalWins,  color: '#ffd700' },
            { label: 'VS LOSS', value: totalLoss,  color: '#ff006e' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-orbitron text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="font-rajdhani text-[10px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Achievements ── */}
      <div className="relative z-10 mb-5">
        <SectionTitle text={`ACHIEVEMENTS (${achievements.length}/${ACHIEVEMENTS.length})`} />
        <div className="grid grid-cols-3 gap-2">
          {ACHIEVEMENTS.map((a, i) => {
            const unlocked = achievSet.has(a.id)
            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl p-3 text-center"
                style={{
                  background: unlocked ? 'rgba(0,245,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${unlocked ? 'rgba(0,245,255,0.25)' : 'rgba(255,255,255,0.05)'}`,
                  opacity: unlocked ? 1 : 0.4,
                }}>
                <div className="text-2xl mb-1">{a.icon}</div>
                <p className="font-orbitron text-[9px] font-bold leading-tight"
                  style={{ color: unlocked ? '#00f5ff' : '#444' }}>
                  {a.name}
                </p>
                <p className="font-rajdhani text-[9px] text-gray-600 mt-0.5 leading-tight">{a.desc}</p>
                {unlocked && (
                  <p className="font-orbitron text-[9px] mt-1" style={{ color: '#ffd700' }}>+{a.xp} XP</p>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

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
                    <p className="font-rajdhani text-[10px] text-gray-500">{s.plays} plays · VS: {s.wins || 0}W {s.losses || 0}L</p>
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
                        vs {m.p2Name} · {m.score} : {m.p2Score}
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
    </div>
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
