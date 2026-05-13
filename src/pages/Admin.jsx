import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { getLevel } from '../context/UserContext'

const ADMIN_EMAIL = 'vmb4manager@gmail.com'

const GAME_LABEL = {
  mathblitz:  '⚡ Math Blitz',
  wordle:     '🔤 Wordle',
  crossword:  '✏️ Crossword',
  wordsearch: '🔍 Word Search',
  flags:      '🌍 Flags',
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function joinDate(ts) {
  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Admin() {
  const [authed,  setAuthed]  = useState(null)   // null=checking, true, false
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [stats,   setStats]   = useState(null)
  const [users,   setUsers]   = useState([])
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState('overview') // 'overview' | 'users'

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [profilesRes, matchesRes, scoresRes] = await Promise.all([
        supabase.from('profiles').select('*').order('joined_at', { ascending: false }),
        supabase.from('matches').select('game, mode, won, played_at, user_id'),
        supabase.from('scores').select('user_id, plays'),
      ])

      if (profilesRes.error) throw profilesRes.error
      if (matchesRes.error)  throw matchesRes.error

      const profiles = profilesRes.data || []
      const matches  = matchesRes.data  || []
      const scores   = scoresRes.data   || []

      // Per-user plays map
      const playsMap = {}
      for (const s of scores) {
        playsMap[s.user_id] = (playsMap[s.user_id] || 0) + (s.plays || 0)
      }

      // Stats
      const today = new Date().toDateString()
      const todaySignups = profiles.filter(p =>
        new Date(p.joined_at).toDateString() === today
      ).length
      const todayGames = matches.filter(m =>
        m.played_at && new Date(m.played_at).toDateString() === today
      ).length

      const last7 = Date.now() - 7 * 24 * 60 * 60 * 1000
      const weekSignups = profiles.filter(p => new Date(p.joined_at).getTime() > last7).length
      const weekGames   = matches.filter(m => m.played_at && new Date(m.played_at).getTime() > last7).length

      const versusCount = matches.filter(m => m.mode === 'versus').length

      // Game breakdown
      const gameBreakdown = {}
      for (const m of matches) {
        gameBreakdown[m.game] = (gameBreakdown[m.game] || 0) + 1
      }

      setStats({
        totalUsers:   profiles.length,
        totalGames:   matches.length,
        todaySignups,
        todayGames,
        weekSignups,
        weekGames,
        versusCount,
        soloCount: matches.length - versusCount,
        gameBreakdown,
      })

      setUsers(profiles.map(p => ({
        ...p,
        totalPlays: playsMap[p.id] || 0,
        level: getLevel(p.xp || 0),
      })))
    } catch (e) {
      setError(e.message || 'Failed to load data. Run the SQL in Supabase to grant admin access.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email !== ADMIN_EMAIL) { setAuthed(false); setLoading(false); return }
      setAuthed(true)
      loadData()
    })
  }, [loadData])

  // ── Auth gate ─────────────────────────────────────────────
  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">🔐</div>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
        <div className="text-5xl">🚫</div>
        <p className="font-orbitron text-sm text-gray-500 tracking-widest">ACCESS DENIED</p>
        <p className="font-rajdhani text-xs text-gray-700 text-center">Admin access only</p>
      </div>
    )
  }

  const filtered = users.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase())
  )

  const maxGame = stats
    ? Object.entries(stats.gameBreakdown).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className="min-h-screen pb-10 px-4 pt-6 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-10%', left: '-15%', opacity: 0.4 }} />
        <div className="orb orb-purple" style={{ bottom: '5%', right: '-10%', opacity: 0.3 }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div>
          <p className="font-orbitron text-[9px] text-gray-600 tracking-widest mb-0.5">ARCADIA DUELS</p>
          <h1 className="font-orbitron text-xl font-black"
            style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ADMIN PANEL
          </h1>
        </div>
        <button onClick={loadData} disabled={loading}
          className="font-orbitron text-[9px] tracking-widest px-3 py-2 rounded-xl transition-all"
          style={{ border: '1px solid rgba(0,245,255,0.3)', color: loading ? '#333' : '#00f5ff' }}>
          {loading ? '...' : '↻ REFRESH'}
        </button>
      </div>

      {error && (
        <div className="relative z-10 mb-5 p-4 rounded-2xl text-center"
          style={{ background: 'rgba(255,0,110,0.08)', border: '1px solid rgba(255,0,110,0.3)' }}>
          <p className="font-orbitron text-[10px] text-arcade-pink mb-1">DATA ACCESS ERROR</p>
          <p className="font-rajdhani text-xs text-gray-500">{error}</p>
          <p className="font-rajdhani text-xs text-gray-600 mt-2">
            Run the SQL grant script in Supabase → SQL Editor
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="relative z-10 flex gap-2 mb-5">
        {['overview', 'users'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl font-orbitron text-[10px] tracking-widest transition-all"
            style={{
              background: tab === t ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tab === t ? '#00f5ff' : 'rgba(255,255,255,0.08)'}`,
              color: tab === t ? '#00f5ff' : '#444',
            }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && stats && (
        <div className="relative z-10 flex flex-col gap-4">

          {/* Big numbers */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'TOTAL USERS',   value: stats.totalUsers,  color: '#00f5ff', icon: '👤' },
              { label: 'TOTAL GAMES',   value: stats.totalGames,  color: '#bf00ff', icon: '🎮' },
              { label: 'SIGNUPS TODAY', value: stats.todaySignups, color: '#00ff88', icon: '✨' },
              { label: 'GAMES TODAY',   value: stats.todayGames,  color: '#ffd700', icon: '⚡' },
            ].map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl p-4"
                style={{ background: `${s.color}08`, border: `1px solid ${s.color}30` }}>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-lg">{s.icon}</span>
                </div>
                <p className="font-orbitron text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="font-rajdhani text-[9px] text-gray-600 tracking-widest mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* This week */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-orbitron text-[9px] text-gray-500 tracking-widest mb-3">LAST 7 DAYS</p>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="font-orbitron text-2xl font-black" style={{ color: '#00ff88' }}>{stats.weekSignups}</p>
                <p className="font-rajdhani text-[10px] text-gray-500 mt-0.5">New users</p>
              </div>
              <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="text-center">
                <p className="font-orbitron text-2xl font-black" style={{ color: '#bf00ff' }}>{stats.weekGames}</p>
                <p className="font-rajdhani text-[10px] text-gray-500 mt-0.5">Games played</p>
              </div>
              <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="text-center">
                <p className="font-orbitron text-2xl font-black" style={{ color: '#ffd700' }}>{stats.versusCount}</p>
                <p className="font-rajdhani text-[10px] text-gray-500 mt-0.5">Battle matches</p>
              </div>
            </div>
          </motion.div>

          {/* Game breakdown */}
          {maxGame.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-orbitron text-[9px] text-gray-500 tracking-widest mb-4">GAMES BY POPULARITY</p>
              <div className="flex flex-col gap-3">
                {maxGame.map(([game, count], i) => {
                  const pct = Math.round((count / stats.totalGames) * 100)
                  const colors = ['#00f5ff', '#bf00ff', '#00ff88', '#ffd700', '#ff006e']
                  const col = colors[i % colors.length]
                  return (
                    <div key={game}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-rajdhani text-xs text-gray-300">{GAME_LABEL[game] || game}</p>
                        <p className="font-orbitron text-[10px]" style={{ color: col }}>{count} <span className="text-gray-600">({pct}%)</span></p>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: col }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.1 * i, ease: 'easeOut' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Recent signups */}
          {users.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-orbitron text-[9px] text-gray-500 tracking-widest mb-3">RECENT SIGNUPS</p>
              <div className="flex flex-col gap-2">
                {users.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <span className="text-xl">{u.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-orbitron text-[10px] text-white truncate">{u.username}</p>
                      <p className="font-rajdhani text-[9px] text-gray-600">LV.{u.level} · {u.totalPlays} games</p>
                    </div>
                    <p className="font-rajdhani text-[9px] text-gray-600 flex-shrink-0">{joinDate(u.joined_at)}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="relative z-10">
          {/* Search */}
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search username..."
            className="w-full bg-transparent border rounded-xl px-4 py-3 mb-4 font-rajdhani text-sm text-white placeholder-gray-700 focus:outline-none transition-all"
            style={{ borderColor: search ? '#00f5ff' : 'rgba(255,255,255,0.1)' }}
          />

          <p className="font-orbitron text-[9px] text-gray-600 tracking-widest mb-3">
            {filtered.length} USER{filtered.length !== 1 ? 'S' : ''}
          </p>

          <div className="flex flex-col gap-2">
            {filtered.map((u, i) => (
              <motion.div key={u.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-2xl flex-shrink-0">{u.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-orbitron text-[11px] text-white truncate">{u.username}</p>
                  <p className="font-rajdhani text-[10px] text-gray-500">
                    LV.{u.level} · {u.xp || 0} XP
                    {u.streak_count > 0 && ` · 🔥${u.streak_count}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-orbitron text-sm font-bold" style={{ color: '#00f5ff' }}>{u.totalPlays}</p>
                  <p className="font-rajdhani text-[9px] text-gray-600">games</p>
                </div>
                <div className="text-right flex-shrink-0 hidden">
                  <p className="font-rajdhani text-[9px] text-gray-600">{joinDate(u.joined_at)}</p>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && !loading && (
              <p className="font-rajdhani text-sm text-gray-600 text-center py-8">No users found</p>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="relative z-10 flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-3xl animate-pulse">📊</div>
          <p className="font-orbitron text-[10px] text-gray-600 tracking-widest animate-pulse">LOADING DATA...</p>
        </div>
      )}
    </div>
  )
}
