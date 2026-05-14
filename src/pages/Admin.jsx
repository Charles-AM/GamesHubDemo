import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { getLevel } from '../context/UserContext'

const ADMIN_EMAIL = 'vmb4manager@gmail.com'

const GAME_LABEL = {
  pong:       '🏓 Pong',
  soccer:     '⚽ Penalty Shootout',
  whack:      '🔨 Whack-a-Mole',
  shooter:    '🎯 Space Shooter',
  runner:     '🏃 Neon Runner',
  fruitslash: '🍉 Fruit Slash',
  archery:    '🏹 Archery',
  snake:      '🐍 Snake',
  celeb:      '🌟 Who Am I?',
  crossword:  '✏️ Crossword',
  wordsearch: '🔍 Word Search',
  flags:      '🌍 Flags',
  // legacy
  mathblitz:  '⚡ Math Blitz',
  wordwalk:   '📝 Word Walk',
}

const ROOM_STATUS_LABEL = {
  waiting:     { label: 'Waiting',    color: '#ffd700' },
  guest_ready: { label: 'Ready',      color: '#00ff88' },
  playing:     { label: 'Playing',    color: '#00f5ff' },
  finished:    { label: 'Finished',   color: '#bf00ff' },
  lobby:       { label: 'Lobby',      color: '#9ca3af' },
  abandoned:   { label: 'Abandoned',  color: '#ff006e' },
}

function joinDate(ts) {
  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Sign-in form shown when not authenticated ──────────────
function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL, password,
    })
    if (err) { setError(err.message); setLoading(false); return }
    onSuccess()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-5%',  left: '-10%' }} />
        <div className="orb orb-purple" style={{ bottom: '8%', right: '-8%' }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="font-orbitron text-lg font-black mb-1"
            style={{ background: 'linear-gradient(90deg,#00f5ff,#bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ADMIN PANEL
          </h1>
          <p className="font-rajdhani text-xs text-gray-600">Arcadia Duels</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div className="px-4 py-3 rounded-xl font-rajdhani text-sm text-gray-500"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {ADMIN_EMAIL}
          </div>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" autoFocus required
            className="w-full bg-transparent border rounded-xl px-4 py-3 font-rajdhani text-sm text-white placeholder-gray-700 focus:outline-none transition-all"
            style={{ borderColor: error ? '#ff006e' : 'rgba(255,255,255,0.15)' }}
          />
          {error && <p className="font-rajdhani text-xs text-center" style={{ color: '#ff006e' }}>{error}</p>}
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading || !password}
            className="w-full py-3 rounded-xl font-orbitron text-xs tracking-widest transition-all mt-1"
            style={{
              background: password ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${password ? '#00f5ff' : 'rgba(255,255,255,0.1)'}`,
              color: password ? '#00f5ff' : '#333',
            }}>
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────
export default function Admin() {
  const [authed,  setAuthed]  = useState(null)  // null=checking, true, false
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [stats,   setStats]   = useState(null)
  const [users,   setUsers]   = useState([])
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState('overview')
  const [rooms,   setRooms]   = useState([])

  const loadData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [profilesRes, matchesRes, scoresRes, roomsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('joined_at', { ascending: false }),
        supabase.from('matches').select('game, mode, won, played_at, user_id'),
        supabase.from('scores').select('user_id, plays'),
        supabase.from('rooms').select('*').order('created_at', { ascending: false }).limit(50),
      ])
      if (profilesRes.error) throw profilesRes.error
      if (matchesRes.error)  throw matchesRes.error
      // rooms errors are non-fatal — table may not exist yet

      const profiles = profilesRes.data || []
      const matches  = matchesRes.data  || []
      const scores   = scoresRes.data   || []
      const roomData = roomsRes.data    || []
      setRooms(roomData)

      // Per-user play totals
      const playsMap = {}
      for (const s of scores) {
        playsMap[s.user_id] = (playsMap[s.user_id] || 0) + (s.plays || 0)
      }

      const today   = new Date().toDateString()
      const last7ms = Date.now() - 7 * 24 * 60 * 60 * 1000

      const gameBreakdown = {}
      for (const m of matches) gameBreakdown[m.game] = (gameBreakdown[m.game] || 0) + 1

      const activeRooms = roomData.filter(r => ['waiting','guest_ready','playing','lobby'].includes(r.status))
      setStats({
        totalUsers:    profiles.length,
        totalGames:    matches.length,
        todaySignups:  profiles.filter(p => new Date(p.joined_at).toDateString() === today).length,
        todayGames:    matches.filter(m => m.played_at && new Date(m.played_at).toDateString() === today).length,
        weekSignups:   profiles.filter(p => new Date(p.joined_at).getTime() > last7ms).length,
        weekGames:     matches.filter(m => m.played_at && new Date(m.played_at).getTime() > last7ms).length,
        versusCount:   matches.filter(m => m.mode === 'versus').length,
        activeRooms:   activeRooms.length,
        abandonedRooms: roomData.filter(r => r.status === 'abandoned').length,
        gameBreakdown,
      })
      setUsers(profiles.map(p => ({
        ...p,
        totalPlays: playsMap[p.id] || 0,
        level: getLevel(p.xp || 0),
      })))
    } catch (e) {
      setError(e.message || 'Failed to load — run the admin SQL in Supabase first')
    }
    setLoading(false)
  }, [])

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email === ADMIN_EMAIL) { setAuthed(true); loadData() }
    else setAuthed(false)
  }, [loadData])

  useEffect(() => { checkAuth() }, [checkAuth])

  // ── States ────────────────────────────────────────────────
  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-3xl animate-pulse">🔐</div>
      </div>
    )
  }

  if (!authed) return <AdminLogin onSuccess={checkAuth} />

  // ── Dashboard ─────────────────────────────────────────────
  const filtered  = users.filter(u => !search || u.username?.toLowerCase().includes(search.toLowerCase()))
  const maxGame   = stats ? Object.entries(stats.gameBreakdown).sort((a, b) => b[1] - a[1]) : []

  return (
    <div className="min-h-screen pb-10 px-4 pt-6 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-10%', left: '-15%', opacity: 0.35 }} />
        <div className="orb orb-purple" style={{ bottom: '5%', right: '-10%', opacity: 0.25 }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-5">
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

      {/* SQL error banner */}
      {error && (
        <div className="relative z-10 mb-4 p-4 rounded-2xl"
          style={{ background: 'rgba(255,0,110,0.08)', border: '1px solid rgba(255,0,110,0.3)' }}>
          <p className="font-orbitron text-[9px] text-arcade-pink tracking-widest mb-1">DATA ERROR</p>
          <p className="font-rajdhani text-xs text-gray-400">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="relative z-10 flex gap-2 mb-5">
        {['overview', 'users', 'rooms'].map(t => (
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

      {/* Loading */}
      {loading && !stats && (
        <div className="relative z-10 flex flex-col items-center py-20 gap-3">
          <div className="text-3xl animate-pulse">📊</div>
          <p className="font-orbitron text-[10px] text-gray-600 tracking-widest animate-pulse">LOADING DATA...</p>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && stats && (
        <div className="relative z-10 flex flex-col gap-4">

          {/* 4-stat grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'TOTAL USERS',   value: stats.totalUsers,   color: '#00f5ff', icon: '👤' },
              { label: 'TOTAL GAMES',   value: stats.totalGames,   color: '#bf00ff', icon: '🎮' },
              { label: 'SIGNUPS TODAY', value: stats.todaySignups, color: '#00ff88', icon: '✨' },
              { label: 'GAMES TODAY',   value: stats.todayGames,   color: '#ffd700', icon: '⚡' },
            ].map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl p-4"
                style={{ background: `${s.color}08`, border: `1px solid ${s.color}30` }}>
                <span className="text-xl">{s.icon}</span>
                <p className="font-orbitron text-3xl font-black mt-2" style={{ color: s.color }}>{s.value}</p>
                <p className="font-rajdhani text-[9px] text-gray-600 tracking-widest mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Last 7 days */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-orbitron text-[9px] text-gray-500 tracking-widest mb-4">LAST 7 DAYS</p>
            <div className="flex items-center justify-around">
              {[
                { label: 'New users',     value: stats.weekSignups,  color: '#00ff88' },
                { label: 'Games played',  value: stats.weekGames,    color: '#bf00ff' },
                { label: 'Battle rounds', value: stats.versusCount,  color: '#ffd700' },
                { label: 'Active rooms',  value: stats.activeRooms,  color: '#00f5ff' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="font-orbitron text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="font-rajdhani text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Game popularity */}
          {maxGame.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-orbitron text-[9px] text-gray-500 tracking-widest mb-4">GAMES BY POPULARITY</p>
              <div className="flex flex-col gap-3">
                {maxGame.map(([game, count], i) => {
                  const pct  = Math.round((count / stats.totalGames) * 100)
                  const cols = ['#00f5ff','#bf00ff','#00ff88','#ffd700','#ff006e']
                  const col  = cols[i % cols.length]
                  return (
                    <div key={game}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-rajdhani text-xs text-gray-300">{GAME_LABEL[game] || game}</p>
                        <p className="font-orbitron text-[10px]" style={{ color: col }}>
                          {count} <span className="text-gray-600">({pct}%)</span>
                        </p>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full" style={{ background: col }}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, delay: 0.1 * i, ease: 'easeOut' }} />
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
              <div className="flex flex-col gap-3">
                {users.slice(0, 10).map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{u.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-orbitron text-[10px] text-white truncate">{u.username}</p>
                      <p className="font-rajdhani text-[9px] text-gray-500 truncate">{u.email || '—'}</p>
                      <p className="font-rajdhani text-[9px] text-gray-600">LV.{u.level} · {u.totalPlays} plays</p>
                    </div>
                    <p className="font-rajdhani text-[9px] text-gray-600 flex-shrink-0 text-right">
                      {joinDate(u.joined_at)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── ROOMS TAB ── */}
      {tab === 'rooms' && (
        <div className="relative z-10 flex flex-col gap-3">
          <p className="font-orbitron text-[9px] text-gray-600 tracking-widest">
            {rooms.length} RECENT ROOMS
          </p>
          {rooms.length === 0 && !loading && (
            <p className="font-rajdhani text-sm text-gray-600 text-center py-10">No rooms found</p>
          )}
          {rooms.map((r, i) => {
            const statusInfo = ROOM_STATUS_LABEL[r.status] || { label: r.status, color: '#9ca3af' }
            const createdAt  = r.created_at ? new Date(r.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '—'
            const hostScore  = r.host_score  ?? '—'
            const guestScore = r.guest_score ?? '—'
            return (
              <motion.div key={r.id || i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="rounded-2xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${statusInfo.color}22` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-orbitron text-[10px] text-white">
                    {r.code || r.id?.slice(0,8) || '—'}
                  </span>
                  <span className="font-orbitron text-[9px] px-2 py-0.5 rounded-full"
                    style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-rajdhani text-[11px] text-gray-400">
                      {GAME_LABEL[r.game] || r.game || '?'}
                    </span>
                  </div>
                  <span className="font-rajdhani text-[10px] text-gray-600">
                    {hostScore} – {guestScore} · {createdAt}
                  </span>
                </div>
                {(r.host_name || r.guest_name) && (
                  <div className="mt-1 font-rajdhani text-[10px] text-gray-600 truncate">
                    {r.host_name || '?'} vs {r.guest_name || 'waiting…'}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="relative z-10">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by username..."
            className="w-full bg-transparent border rounded-xl px-4 py-3 mb-4 font-rajdhani text-sm text-white placeholder-gray-700 focus:outline-none transition-all"
            style={{ borderColor: search ? '#00f5ff' : 'rgba(255,255,255,0.1)' }} />

          <p className="font-orbitron text-[9px] text-gray-600 tracking-widest mb-3">
            {filtered.length} PLAYER{filtered.length !== 1 ? 'S' : ''}
          </p>

          <div className="flex flex-col gap-2">
            {filtered.map((u, i) => (
              <motion.div key={u.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.25) }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-2xl flex-shrink-0">{u.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-orbitron text-[11px] text-white truncate">{u.username}</p>
                  <p className="font-rajdhani text-[10px] text-gray-500 truncate">{u.email || '—'}</p>
                  <p className="font-rajdhani text-[9px] text-gray-600">
                    LV.{u.level} · {u.xp || 0} XP{u.streak_count > 0 ? ` · 🔥${u.streak_count}` : ''} · {joinDate(u.joined_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-orbitron text-sm font-black" style={{ color: '#00f5ff' }}>{u.totalPlays}</p>
                  <p className="font-rajdhani text-[9px] text-gray-600">games</p>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && !loading && (
              <p className="font-rajdhani text-sm text-gray-600 text-center py-10">No players found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
