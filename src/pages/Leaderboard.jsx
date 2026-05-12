import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../context/UserContext'
import { GAME_LIST } from '../games/gameRegistry'

const TABS = [
  { id: 'overall',    label: 'OVERALL',      icon: '🏅' },
  { id: 'trivia',     label: 'TRIVIA',        icon: '🧠' },
  { id: 'wordle',     label: 'WORDLE',        icon: '🔤' },
  { id: 'crossword',  label: 'CROSSWORD',     icon: '✏️' },
  { id: 'wordsearch', label: 'WORD SEARCH',   icon: '🔍' },
  { id: 'flags',      label: 'FLAGS',         icon: '🌍' },
]

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32']
const RANK_ICONS  = ['👑', '🥈', '🥉']

export default function Leaderboard() {
  const { user, allUsers, allScores } = useUser()
  const [activeTab, setActiveTab] = useState('overall')

  // Build ranked list
  const rows = Object.values(allUsers).map(u => {
    const uScores = allScores[u.id] || {}
    let score = 0
    if (activeTab === 'overall') {
      score = Object.values(uScores).reduce((a, s) => a + (s.best || 0), 0)
    } else {
      score = uScores[activeTab]?.best || 0
    }
    const plays = activeTab === 'overall'
      ? Object.values(uScores).reduce((a, s) => a + s.plays, 0)
      : (uScores[activeTab]?.plays || 0)
    const wins = activeTab === 'overall'
      ? Object.values(uScores).reduce((a, s) => a + (s.wins || 0), 0)
      : (uScores[activeTab]?.wins || 0)
    return { ...u, score, plays, wins }
  }).sort((a, b) => b.score - a.score)

  const myRank = rows.findIndex(r => r.id === user?.id) + 1
  const tab    = TABS.find(t => t.id === activeTab)

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden">

      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-5%', left: '-10%' }} />
        <div className="orb orb-purple" style={{ bottom: '5%', right: '-8%' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 pt-6 pb-4">
        <p className="font-orbitron text-xs text-gray-500 tracking-widest mb-1">LEADERBOARD</p>
        <h2 className="font-orbitron text-xl font-black neon-text-gold">HALL OF FAME</h2>
        <p className="font-rajdhani text-xs text-gray-500 mt-1">
          {rows.length} player{rows.length !== 1 ? 's' : ''} on this device
        </p>
      </div>

      {/* Tabs */}
      <div className="relative z-10 px-4 mb-5 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-orbitron text-[10px] tracking-wider transition-all whitespace-nowrap"
              style={{
                background: activeTab === t.id ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeTab === t.id ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: activeTab === t.id ? '#ffd700' : '#555',
              }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* My rank banner */}
      {myRank > 0 && (
        <div className="relative z-10 mx-4 mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)' }}>
          <span className="font-orbitron text-2xl font-black" style={{ color: '#00f5ff' }}>#{myRank}</span>
          <div className="flex-1">
            <p className="font-orbitron text-xs font-bold text-white">YOUR RANKING</p>
            <p className="font-rajdhani text-[10px] text-gray-500">{tab?.icon} {tab?.label}</p>
          </div>
          <span className="font-orbitron text-lg font-black" style={{ color: '#00f5ff' }}>
            {rows[myRank - 1]?.score || 0}
          </span>
        </div>
      )}

      {/* Rankings */}
      <div className="relative z-10 px-4">
        {rows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏆</p>
            <p className="font-orbitron text-sm text-gray-500">No scores yet</p>
            <p className="font-rajdhani text-xs text-gray-600 mt-1">Play some games to get on the board!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {rows.map((row, i) => {
                const isMe    = row.id === user?.id
                const rankColor = RANK_COLORS[i] || (isMe ? '#00f5ff' : 'rgba(255,255,255,0.3)')
                const rankIcon  = RANK_ICONS[i]

                return (
                  <motion.div key={`${activeTab}-${row.id}`}
                    layout
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{
                      background: isMe
                        ? 'rgba(0,245,255,0.07)'
                        : i < 3 ? `rgba(255,215,0,0.04)` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isMe ? 'rgba(0,245,255,0.25)' : i < 3 ? `rgba(255,215,0,0.15)` : 'rgba(255,255,255,0.05)'}`,
                    }}>

                    {/* Rank */}
                    <div className="w-8 text-center flex-shrink-0">
                      {rankIcon ? (
                        <span className="text-lg">{rankIcon}</span>
                      ) : (
                        <span className="font-orbitron text-xs" style={{ color: rankColor }}>#{i + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {row.avatar}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-orbitron text-xs font-bold truncate"
                          style={{ color: isMe ? '#00f5ff' : '#ddd' }}>
                          {row.username}
                        </p>
                        {isMe && (
                          <span className="font-orbitron text-[8px] px-1 py-0.5 rounded"
                            style={{ background: 'rgba(0,245,255,0.15)', color: '#00f5ff' }}>YOU</span>
                        )}
                      </div>
                      <p className="font-rajdhani text-[10px] text-gray-500">
                        LV.{Math.floor((row.xp || 0) / 300) + 1} · {row.plays} plays
                        {row.wins > 0 && ` · ${row.wins}W`}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-orbitron text-lg font-black" style={{ color: rankColor }}>
                        {row.score.toLocaleString()}
                      </p>
                      <p className="font-rajdhani text-[9px] text-gray-600">
                        {activeTab === 'overall' ? 'TOTAL BEST' : 'BEST SCORE'}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Backend teaser */}
      <div className="relative z-10 mx-4 mt-6 px-4 py-3 rounded-2xl text-center"
        style={{ background: 'rgba(191,0,255,0.06)', border: '1px solid rgba(191,0,255,0.2)' }}>
        <p className="font-orbitron text-[10px] text-gray-500 tracking-wider">🌐 GLOBAL LEADERBOARD COMING SOON</p>
        <p className="font-rajdhani text-xs text-gray-600 mt-1">Challenge players worldwide</p>
      </div>
    </div>
  )
}
