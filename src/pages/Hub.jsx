import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser, getLevel, getLevelPct, getDailyGame, todayKey } from '../context/UserContext'
import { GAME_LIST, GAME_REGISTRY } from '../games/gameRegistry'

const GAME_ICONS = { mathblitz: '⚡', archery: '🏹', crossword: '✏️', wordsearch: '🔍', flags: '🌍', snake: '🐍', celeb: '🌟' }
const GAME_NAMES = { mathblitz: 'MATH BLITZ', archery: 'ARCHERY', crossword: 'CROSSWORD', wordsearch: 'WORD SEARCH', flags: 'FLAGS', snake: 'SNAKE', celeb: 'WHO AM I?' }

function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Hub() {
  const { user, scores, matchHistory, signOut: logout } = useUser()
  const navigate = useNavigate()
  const [expandGame,  setExpandGame]  = useState(null)
  const [showHowTo,   setShowHowTo]   = useState(false)

  const xp    = user?.xp || 0
  const level = getLevel(xp)
  const pct   = getLevelPct(xp)

  // Daily challenge
  const dailyId   = getDailyGame()
  const dailyGame = GAME_REGISTRY[dailyId]
  const dailyDone = matchHistory.some(m => {
    if (!m.isDaily || m.game !== dailyId) return false
    const d = new Date(m.date)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey()
  })

  // Recent activity (last 4 matches)
  const recent = matchHistory.slice(0, 4)

  const totalPlays = Object.values(scores).reduce((a, s) => a + (s.plays || 0), 0)
  const totalWins  = matchHistory.filter(m => m.mode === 'versus' && m.won === true).length

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden">

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-5%',  left: '-10%' }} />
        <div className="orb orb-purple" style={{ bottom: '8%', right: '-8%' }} />
        <div className="orb orb-pink"   style={{ top: '45%',  left: '35%'  }} />
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 px-5 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-lg">🕹️</span>
          <span className="font-orbitron text-sm font-black tracking-wider"
            style={{ background: 'linear-gradient(90deg, #00f5ff, #bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ARCADIA DUELS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHowTo(true)}
            className="font-orbitron text-[10px] text-gray-500 hover:text-gray-300 transition-colors px-2 py-1">
            ? HOW TO PLAY
          </button>
          <button onClick={logout}
            className="font-orbitron text-[10px] text-gray-600 hover:text-gray-400 transition-colors px-2 py-1">
            EXIT ›
          </button>
        </div>
      </div>

      {/* ── Profile Card ── */}
      <div className="relative z-10 mx-4 mb-4">
        <div className="rounded-2xl p-4 flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,255,0.07), rgba(191,0,255,0.07))',
            border: '1px solid rgba(0,245,255,0.2)',
          }}>
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {user?.avatar || '🎮'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-orbitron text-sm font-black text-white truncate">{user?.username}</p>
              <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(0,245,255,0.15)', color: '#00f5ff', border: '1px solid rgba(0,245,255,0.3)' }}>
                LV.{level}
              </span>
            </div>
            {/* XP bar */}
            <div className="h-1.5 bg-gray-800 rounded-full mb-1.5 overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #00f5ff, #bf00ff)' }}
                initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
            </div>
            <div className="flex items-center gap-3">
              <p className="font-rajdhani text-[10px] text-gray-500">{xp} XP</p>
              {user?.streak?.count > 0 && (
                <span className="font-orbitron text-[10px]" style={{ color: '#ffd700' }}>
                  🔥 {user.streak.count} day streak
                </span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex-shrink-0 text-right">
            <p className="font-orbitron text-xs font-bold text-white">{totalPlays}</p>
            <p className="font-rajdhani text-[10px] text-gray-500">PLAYED</p>
            <p className="font-orbitron text-xs font-bold mt-1" style={{ color: '#ffd700' }}>{totalWins}</p>
            <p className="font-rajdhani text-[10px] text-gray-500">WINS</p>
          </div>
        </div>
      </div>

      {/* ── Daily Challenge ── */}
      <div className="relative z-10 mx-4 mb-5">
        <motion.div
          whileTap={!dailyDone ? { scale: 0.98 } : {}}
          onClick={!dailyDone ? () => navigate(`/game/${dailyId}/daily`) : undefined}
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: dailyDone
              ? 'rgba(255,255,255,0.03)'
              : `linear-gradient(135deg, ${dailyGame.gradient.match(/#[^,)]+/g)?.[0] || dailyGame.color}22, rgba(255,215,0,0.12))`,
            border: `1px solid ${dailyDone ? 'rgba(255,255,255,0.08)' : 'rgba(255,215,0,0.5)'}`,
            boxShadow: dailyDone ? 'none' : '0 0 30px rgba(255,215,0,0.1)',
            cursor: dailyDone ? 'default' : 'pointer',
          }}>
          {/* Glow strip */}
          {!dailyDone && (
            <div className="absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #ffd700, transparent)' }} />
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                background: dailyDone ? 'rgba(255,255,255,0.04)' : 'rgba(255,215,0,0.15)',
                border: `1px solid ${dailyDone ? 'rgba(255,255,255,0.08)' : 'rgba(255,215,0,0.4)'}`,
              }}>
              {dailyGame.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-orbitron text-[9px] tracking-widest"
                  style={{ color: dailyDone ? '#555' : '#ffd700' }}>
                  📅 TODAY'S CHALLENGE
                </span>
                {!dailyDone && (
                  <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,215,0,0.2)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.4)' }}>
                    2× XP
                  </span>
                )}
              </div>
              <p className="font-orbitron text-sm font-black"
                style={{ color: dailyDone ? '#555' : '#fff' }}>
                {dailyGame.label}
              </p>
            </div>
            <div className="flex-shrink-0">
              {dailyDone ? (
                <span className="font-orbitron text-xs text-green-500">✓ DONE</span>
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,215,0,0.2)', border: '1px solid rgba(255,215,0,0.5)' }}>
                  <span className="text-arcade-gold font-bold text-sm">▶</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Section title ── */}
      <div className="relative z-10 px-5 mb-4 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">CHOOSE YOUR BATTLE</p>
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* ── Game Grid (2-col for first 4, full for 5th) ── */}
      <div className="relative z-10 px-4">
        {/* 2-col grid for all games */}
        <div className="grid grid-cols-2 gap-3">
          {GAME_LIST.map((g, i) => (
            <GameCard key={g.id} game={g} scores={scores[g.id]} navigate={navigate} delay={i * 0.05} />
          ))}
        </div>
      </div>

      {/* ── How to Play Modal ── */}
      <AnimatePresence>
        {showHowTo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center px-0"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowHowTo(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
              style={{ background: 'rgba(10,10,28,0.98)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '85vh' }}>

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>

              <div className="px-5 pb-8 pt-2">
                <h2 className="font-orbitron text-lg font-black text-center mb-1"
                  style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  HOW TO PLAY
                </h2>
                <p className="font-rajdhani text-xs text-gray-500 text-center mb-6 tracking-widest">ARCADIA DUELS</p>

                {/* Games */}
                <p className="font-orbitron text-[9px] text-gray-500 tracking-widest mb-3">THE GAMES</p>
                {[
                  { icon: '⚡', name: 'MATH BLITZ', desc: 'Solve as many arithmetic equations as you can in 60 seconds. Pick the correct answer from 4 options. +10 for correct, –3 for wrong. Speed and accuracy win.' },
                  { icon: '🐍', name: 'SNAKE', desc: 'Guide your snake to eat food and grow longer — without hitting walls or your own tail. The snake gets faster as you eat more. You have 60 seconds.' },
                  { icon: '🏹', name: 'ARCHERY', desc: 'Pull the bowstring and aim your crosshair at the target — drag to aim, release to shoot. The longer you hold, the more your hand shakes. 10 shots, highest score wins.' },
                  { icon: '🌟', name: 'WHO AM I?', desc: 'Guess the celebrity from cryptic clues across movies, sports, music and TV. Answer on the first hint for 10 pts, reveal more hints for 6 or 3 pts. 10 rounds — perfect for battle mode!' },
                  { icon: '✏️', name: 'CROSSWORD', desc: 'Fill in the grid using the clues. Complete words earn points. Finish the whole puzzle for a bonus.' },
                  { icon: '🔍', name: 'WORD SEARCH', desc: 'Find all the hidden words in the grid before time runs out. Words go in any direction. Tap the first and last letter of each word.' },
                  { icon: '🌍', name: 'FLAG FRENZY', desc: 'Identify the country from its flag. 10 rounds, 4 choices each. Fast correct answers give bonus points.' },
                ].map(g => (
                  <div key={g.name} className="flex gap-3 mb-4 pb-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {g.icon}
                    </div>
                    <div>
                      <p className="font-orbitron text-[11px] font-bold text-white mb-1">{g.name}</p>
                      <p className="font-rajdhani text-xs text-gray-400 leading-relaxed">{g.desc}</p>
                    </div>
                  </div>
                ))}

                {/* Battle mode */}
                <p className="font-orbitron text-[9px] text-gray-500 tracking-widest mb-3 mt-2">BATTLE MODE ⚔️</p>
                <div className="rounded-2xl p-4 mb-4"
                  style={{ background: 'rgba(191,0,255,0.06)', border: '1px solid rgba(191,0,255,0.25)' }}>
                  <p className="font-rajdhani text-sm text-gray-300 leading-relaxed mb-3">
                    Challenge a friend to a real-time duel — both of you play the same game simultaneously and your scores are compared when time's up.
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      { step: '1', text: 'One player creates a room and picks a game' },
                      { step: '2', text: 'Share the 6-character code with your opponent' },
                      { step: '3', text: 'Once they join, the host starts the match' },
                      { step: '4', text: 'Both players play at the same time — highest score wins' },
                      { step: '5', text: 'Play multiple rounds in the same room and track series wins' },
                    ].map(s => (
                      <div key={s.step} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center font-orbitron text-[10px] flex-shrink-0 mt-0.5"
                          style={{ background: 'rgba(191,0,255,0.2)', color: '#bf00ff', border: '1px solid rgba(191,0,255,0.4)' }}>
                          {s.step}
                        </div>
                        <p className="font-rajdhani text-xs text-gray-400">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => setShowHowTo(false)}
                  className="w-full mt-5 py-3 rounded-2xl font-orbitron text-xs tracking-widest transition-all"
                  style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.3)', color: '#00f5ff' }}>
                  LET'S PLAY
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Recent Activity ── */}
      {recent.length > 0 && (
        <div className="relative z-10 px-4 mt-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">RECENT ACTIVITY</p>
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div className="flex flex-col gap-2">
            {recent.map((m, i) => <ActivityRow key={m.id} match={m} i={i} />)}
          </div>
        </div>
      )}

    </div>
  )
}

function GameCard({ game, scores: s, navigate, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, type: 'spring', stiffness: 130 }}>
      <div className="rounded-2xl p-3 flex flex-col h-full"
        style={{ background: game.gradient, border: `1px solid ${game.border}`, boxShadow: `0 4px 24px ${game.glow}` }}>

        {/* Icon + best score */}
        <div className="flex items-start justify-between mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: `${game.color}20`, border: `1px solid ${game.color}44` }}>
            {game.icon}
          </div>
          {s && (
            <div className="text-right">
              <p className="font-orbitron text-sm font-black leading-tight" style={{ color: game.color }}>{s.best}</p>
              <p className="font-rajdhani text-[9px] text-gray-600">{s.plays}× played</p>
            </div>
          )}
        </div>

        <p className="font-orbitron text-[10px] font-black mb-2 leading-tight flex-1" style={{ color: game.color }}>
          {GAME_NAMES[game.id] || game.label}
        </p>

        <button onClick={() => navigate(`/game/${game.id}/solo`)}
          className="w-full py-1.5 rounded-lg font-orbitron text-[9px] font-bold tracking-wider transition-all"
          style={{ background: `${game.color}18`, border: `1px solid ${game.color}66`, color: game.color }}>
          ▶ PLAY
        </button>
      </div>
    </motion.div>
  )
}

function GameCardWide({ game, scores: s, navigate, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, type: 'spring', stiffness: 130 }}>
      <div className="rounded-2xl p-4 relative overflow-hidden"
        style={{ background: game.gradient, border: `1px solid ${game.border}`, boxShadow: `0 4px 30px ${game.glow}` }}>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `${game.color}20`, border: `1px solid ${game.color}44` }}>
            {game.icon}
          </div>
          <div className="flex-1">
            <span className="font-orbitron text-[9px] tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: `${game.color}18`, color: game.color }}>
              {game.tag}
            </span>
            <p className="font-orbitron text-sm font-black mt-0.5" style={{ color: game.color }}>{game.label}</p>
            <p className="font-rajdhani text-xs text-gray-400">{game.desc}</p>
          </div>
          {s && (
            <div className="text-right flex-shrink-0">
              <p className="font-orbitron text-xl font-black" style={{ color: game.color }}>{s.best}</p>
              <p className="font-rajdhani text-[10px] text-gray-500">{s.plays} plays</p>
            </div>
          )}
        </div>

        <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate(`/game/${game.id}/solo`)}
          className="w-full py-2.5 rounded-xl font-orbitron text-xs font-bold tracking-wider"
          style={{ background: `${game.color}18`, border: `1px solid ${game.color}`, color: game.color }}>
          ▶ PLAY SOLO
        </motion.button>
      </div>
    </motion.div>
  )
}

function ActivityRow({ match, i }) {
  const isVs   = match.mode === 'versus'
  const isWin  = match.won === true
  const isLoss = match.won === false
  const icon   = GAME_ICONS[match.game] || '🎮'
  const name   = GAME_NAMES[match.game] || match.game

  let dotColor = '#555'
  let label    = `▶ Solo · ${match.score} pts`
  if (match.isDaily) { dotColor = '#ffd700'; label = `📅 Daily · ${match.score} pts` }
  else if (isVs && isWin)  { dotColor = '#00ff88'; label = `⚔ Beat ${match.p2Name ?? 'opponent'}${match.p2Score != null ? ` · ${match.score} vs ${match.p2Score}` : ''}` }
  else if (isVs && isLoss) { dotColor = '#ff006e'; label = `⚔ Lost to ${match.p2Name ?? 'opponent'}${match.p2Score != null ? ` · ${match.score} vs ${match.p2Score}` : ''}` }
  else if (isVs)            { dotColor = '#888';   label = `⚔ Drew ${match.p2Name ?? 'opponent'}` }

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
      <span className="text-sm">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-rajdhani text-xs text-gray-300 truncate">{label}</p>
        <p className="font-orbitron text-[9px] text-gray-600">{name}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-orbitron text-[10px]" style={{ color: '#00f5ff' }}>+{match.xpEarned} XP</p>
        <p className="font-rajdhani text-[9px] text-gray-600">{timeAgo(match.date)}</p>
      </div>
    </motion.div>
  )
}
