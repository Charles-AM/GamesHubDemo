import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useUser } from '../context/UserContext'
import { GAME_LIST, GAME_REGISTRY } from '../games/gameRegistry'
import { GameIcon, Icon } from '../components/Icons'

const SERIES_WIN = 5   // first to 5 round-wins is series champion

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/* ── Count-up animation helper ─────────────────────────────────────────────── */
function CountUp({ target, duration = 1000, delay = 0 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (target <= 0) { setDisplay(target); return }
    let startTime = null
    let frame
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp + delay * 1000
      const elapsed = Math.max(0, timestamp - startTime)
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(eased * target))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, delay])
  return <>{display.toLocaleString()}</>
}

export default function GameRoom() {
  const { user, recordGame } = useUser()
  const navigate = useNavigate()

  const [screen,         setScreen]         = useState('menu')
  const [room,           setRoom]           = useState(null)
  const [isHost,         setIsHost]         = useState(false)
  const [joinCode,       setJoinCode]       = useState('')
  const [selectedGame,   setSelectedGame]   = useState(() => GAME_LIST[0]?.id || 'pong')
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [countdown,      setCountdown]      = useState(3)
  const [myScore,        setMyScore]        = useState(null)
  const [rewardInfo,     setRewardInfo]     = useState(null)
  const [scoreSent,      setScoreSent]      = useState(false)
  const [copied,         setCopied]         = useState(false)
  const [rounds,         setRounds]         = useState([])
  const [seriesScore,    setSeriesScore]    = useState({ me: 0, opp: 0, draws: 0 })
  const [seriesOver,     setSeriesOver]     = useState(false)
  const [seriesChampion, setSeriesChampion] = useState(null)   // 'me' | 'opp'
  const [showNextPicker, setShowNextPicker] = useState(false)
  const [nextGameChoice, setNextGameChoice] = useState(() => GAME_LIST[0]?.id || 'pong')
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [waitingTooLong,  setWaitingTooLong]  = useState(false)

  const channelRef    = useRef(null)
  const rewardRef     = useRef(false)
  const roundSavedRef = useRef(false)
  const screenRef     = useRef('menu')

  useEffect(() => { screenRef.current = screen }, [screen])

  // If stuck on waiting screen for 90s, show escape hatch
  useEffect(() => {
    if (screen !== 'waiting') { setWaitingTooLong(false); return }
    const t = setTimeout(() => setWaitingTooLong(true), 90_000)
    return () => clearTimeout(t)
  }, [screen])

  const subscribeToRoom = useCallback((roomId) => {
    channelRef.current?.unsubscribe()
    channelRef.current = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => setRoom(payload.new))
      .subscribe()
  }, [])

  useEffect(() => () => { channelRef.current?.unsubscribe() }, [])

  /* ── Reconnect after page refresh ── */
  useEffect(() => {
    const saved = sessionStorage.getItem('arcadia_room')
    if (!saved) return
    const { roomId, asHost } = JSON.parse(saved)
    supabase.from('rooms').select('*').eq('id', roomId).maybeSingle()
      .then(({ data }) => {
        if (!data || data.status === 'finished' || data.status === 'abandoned') {
          sessionStorage.removeItem('arcadia_room')
          return
        }
        setRoom(data)
        setIsHost(asHost)
        setScreen('lobby')
        subscribeToRoom(data.id)
      })
  }, [subscribeToRoom])

  /* ── React to room state from Realtime ── */
  useEffect(() => {
    if (!room) return

    // Someone quit mid-game — everyone goes home
    if (room.status === 'abandoned') {
      sessionStorage.removeItem('arcadia_room')
      channelRef.current?.unsubscribe()
      navigate('/hub')
      return
    }

    if (room.status === 'lobby' && (screenRef.current === 'results' || screenRef.current === 'waiting')) {
      roundSavedRef.current = false
      rewardRef.current     = false
      setScoreSent(false)
      setMyScore(null)
      setRewardInfo(null)
      setShowNextPicker(false)
      setScreen('lobby')
      return
    }

    if (room.status === 'playing' && screenRef.current === 'lobby') {
      setScreen('vsscreen')
      let n = 3
      let countdownInterval
      const vsTimer = setTimeout(() => {
        setScreen('countdown')
        setCountdown(n)
        countdownInterval = setInterval(() => {
          n--
          setCountdown(n)
          if (n <= 0) { clearInterval(countdownInterval); setScreen('playing') }
        }, 1000)
      }, 2200)
      return () => { clearTimeout(vsTimer); clearInterval(countdownInterval) }
    }

    const bothScoresIn = room.host_score !== null && room.guest_score !== null
    if ((bothScoresIn || room.status === 'finished') && screenRef.current !== 'results') {
      if (room.status !== 'finished') {
        supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id)
      }
      setScreen('results')
      return
    }
  }, [room])

  /* ── Award XP + save round exactly once on results ── */
  useEffect(() => {
    if (screen !== 'results' || !room || rewardRef.current) return
    const mySc  = isHost ? room.host_score  : room.guest_score
    const oppSc = isHost ? room.guest_score : room.host_score
    if (mySc === null || oppSc === null) return
    rewardRef.current = true
    const won = mySc > oppSc ? true : mySc < oppSc ? false : null

    if (!roundSavedRef.current) {
      roundSavedRef.current = true
      setRounds(prev => [...prev, { game: room.game, myScore: mySc, oppScore: oppSc, won }])
      setSeriesScore(prev => {
        const newMe    = prev.me    + (won === true  ? 1 : 0)
        const newOpp   = prev.opp   + (won === false ? 1 : 0)
        const newDraws = prev.draws + (won === null  ? 1 : 0)
        if (newMe >= SERIES_WIN || newOpp >= SERIES_WIN) {
          setSeriesOver(true)
          setSeriesChampion(newMe >= SERIES_WIN ? 'me' : 'opp')
        }
        return { me: newMe, opp: newOpp, draws: newDraws }
      })
    }

    recordGame({
      game: room.game, score: mySc,
      mode: 'versus', won,
      p2Name:  isHost ? room.guest_username : room.host_username,
      p2Score: oppSc,
    }).then(info => setRewardInfo(info))
  }, [screen, room, isHost, recordGame])

  /* ── Actions ── */
  const createRoom = async () => {
    setLoading(true); setError('')
    try {
      const { data, error: err } = await supabase.from('rooms').insert({
        code: genCode(), game: selectedGame, status: 'waiting',
        host_id: user.id, host_username: user.username, host_avatar: user.avatar,
      }).select().maybeSingle()
      if (err) throw err
      setRoom(data); setIsHost(true); setScreen('lobby')
      sessionStorage.setItem('arcadia_room', JSON.stringify({ roomId: data.id, asHost: true }))
      subscribeToRoom(data.id)
    } catch (e) { setError(e.message || 'Failed to create room') }
    finally { setLoading(false) }
  }

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) { setError('Enter the 6-character room code'); return }
    setLoading(true); setError('')
    try {
      const { data: found, error: findErr } = await supabase
        .from('rooms').select('*').eq('code', code).eq('status', 'waiting').maybeSingle()
      if (findErr || !found) { setError('Room not found or already started'); return }
      if (found.host_id === user.id) { setError("You can't join your own room"); return }
      const { data, error: joinErr } = await supabase.from('rooms')
        .update({ guest_id: user.id, guest_username: user.username, guest_avatar: user.avatar })
        .eq('id', found.id).select().maybeSingle()
      if (joinErr) throw joinErr
      if (!data) throw new Error('Could not join room — permission denied. Try again.')
      setRoom(data); setIsHost(false); setScreen('lobby')
      sessionStorage.setItem('arcadia_room', JSON.stringify({ roomId: data.id, asHost: false }))
      subscribeToRoom(data.id)
    } catch (e) { setError(e.message || 'Failed to join room') }
    finally { setLoading(false) }
  }

  const readyUp = async () => {
    await supabase.from('rooms').update({ status: 'guest_ready' }).eq('id', room.id)
  }

  const startGame = async () => {
    if (room.status !== 'guest_ready') return  // guard: guest must be ready first
    const { error: err } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', room.id)
    if (err) setError('Failed to start')
  }

  const handleGameFinish = async (score) => {
    if (scoreSent) return
    setScoreSent(true); setMyScore(score); setScreen('waiting')
    await supabase.from('rooms')
      .update(isHost ? { host_score: score } : { guest_score: score })
      .eq('id', room.id)
  }

  const copyCode = () => {
    navigator.clipboard?.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const nextRound = async () => {
    setLoading(true)
    await supabase.from('rooms').update({
      game: nextGameChoice,
      status: 'lobby',
      host_score: null,
      guest_score: null,
    }).eq('id', room.id)
    setLoading(false)
  }

  const playAgain = () => {
    sessionStorage.removeItem('arcadia_room')
    setRoom(null); setIsHost(false); setMyScore(null)
    setRewardInfo(null); setScoreSent(false); rewardRef.current = false
    roundSavedRef.current = false; setCopied(false)
    setRounds([]); setSeriesScore({ me: 0, opp: 0, draws: 0 })
    setSeriesOver(false); setSeriesChampion(null)
    setShowNextPicker(false); setShowQuitConfirm(false); setWaitingTooLong(false)
    setScreen('create')
  }

  const forfeit = async () => {
    if (!room) { goHome(); return }
    // 'abandoned' tells ALL clients to go home — not just the forfeiter
    await supabase.from('rooms').update({ status: 'abandoned' }).eq('id', room.id)
    sessionStorage.removeItem('arcadia_room')
    channelRef.current?.unsubscribe()
    navigate('/hub')
  }

  const leaveRoom = async () => {
    // If a game is in progress or lobby is live, mark abandoned so both players exit
    if (room && ['waiting', 'guest_ready', 'playing', 'lobby'].includes(room.status)) {
      await supabase.from('rooms').update({ status: 'abandoned' }).eq('id', room.id)
    }
    sessionStorage.removeItem('arcadia_room')
    channelRef.current?.unsubscribe()
    navigate('/hub')
  }

  const goHome = () => {
    sessionStorage.removeItem('arcadia_room')
    channelRef.current?.unsubscribe()
    navigate('/hub')
  }

  const GameComp = room ? GAME_REGISTRY[room.game]?.component : null

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden">

      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-5%',  left: '-10%' }} />
        <div className="orb orb-purple" style={{ bottom: '8%', right: '-8%' }} />
      </div>

      {/* Header — hidden during gameplay and VS screen */}
      {screen !== 'playing' && screen !== 'vsscreen' && screen !== 'countdown' && (
        <div className="relative z-10 px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={goHome}
            className="font-orbitron text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
            ← HUB
          </button>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="flex items-center gap-1.5">
            <Icon name="swords" size={12} color="#4a4a6a" strokeWidth={1.5} />
            <p className="font-orbitron text-[10px] text-gray-600 tracking-widest">BATTLE ROOM</p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── MENU ── */}
        {screen === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="relative z-10 px-4 pt-4">

            <div className="text-center mb-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)', boxShadow: '0 0 40px rgba(0,245,255,0.1)' }}>
                  <Icon name="swords" size={36} color="#00f5ff" strokeWidth={1.5} />
                </div>
              </motion.div>
              <h1 className="font-orbitron text-2xl font-black neon-text-cyan mb-2">BATTLE ROOM</h1>
              <p className="font-rajdhani text-sm text-gray-500">Challenge a friend to a real-time duel</p>
            </div>

            <div className="flex flex-col gap-4">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen('create')}
                className="w-full py-6 rounded-2xl flex flex-col items-center gap-2"
                style={{ background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.4)', boxShadow: '0 0 30px rgba(0,245,255,0.08)' }}>
                <Icon name="controller" size={28} color="#00f5ff" strokeWidth={1.5} />
                <span className="font-orbitron text-sm font-black tracking-widest" style={{ color: '#00f5ff' }}>CREATE ROOM</span>
                <span className="font-rajdhani text-xs text-gray-500">Pick a game · Share the code</span>
              </motion.button>

              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen('join')}
                className="w-full py-6 rounded-2xl flex flex-col items-center gap-2"
                style={{ background: 'rgba(191,0,255,0.06)', border: '1px solid rgba(191,0,255,0.4)', boxShadow: '0 0 30px rgba(191,0,255,0.08)' }}>
                <Icon name="key" size={28} color="#bf00ff" strokeWidth={1.5} />
                <span className="font-orbitron text-sm font-black tracking-widest" style={{ color: '#bf00ff' }}>JOIN ROOM</span>
                <span className="font-rajdhani text-xs text-gray-500">Enter your friend's code</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── CREATE ── */}
        {screen === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }} className="relative z-10 px-4">

            <p className="font-orbitron text-[10px] text-gray-500 tracking-widest text-center mb-5">PICK A GAME</p>

            <div className="flex flex-col gap-2 mb-6">
              {GAME_LIST.map(g => {
                const sel = selectedGame === g.id
                return (
                  <button key={g.id} onClick={() => setSelectedGame(g.id)}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left"
                    style={{
                      background:  sel ? `${g.color}14` : 'rgba(255,255,255,0.03)',
                      border:     `1px solid ${sel ? g.border : 'rgba(255,255,255,0.08)'}`,
                      boxShadow:   sel ? `0 0 20px ${g.glow}` : 'none',
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${g.color}18`, border: `1px solid ${g.color}44` }}>
                      <GameIcon id={g.id} size={20} color={g.color} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <p className="font-orbitron text-xs font-bold" style={{ color: sel ? g.color : '#aaa' }}>
                        {g.label}
                      </p>
                      <p className="font-rajdhani text-[11px] text-gray-500">{g.desc}</p>
                    </div>
                    {sel && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: g.color }}>
                        <Icon name="check" size={11} color="#000" strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-3">{error}</p>}

            <motion.button whileTap={{ scale: 0.96 }} onClick={createRoom} disabled={loading}
              className="w-full py-4 rounded-2xl font-orbitron text-sm font-black tracking-widest mb-3 flex items-center justify-center gap-2"
              style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid #00f5ff', color: loading ? '#555' : '#00f5ff' }}>
              <Icon name="plus" size={16} color={loading ? '#555' : '#00f5ff'} strokeWidth={2.5} />
              {loading ? 'CREATING...' : 'CREATE ROOM'}
            </motion.button>

            <button onClick={() => setScreen('menu')}
              className="w-full py-2 font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
              ← BACK
            </button>
          </motion.div>
        )}

        {/* ── JOIN ── */}
        {screen === 'join' && (
          <motion.div key="join" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }} className="relative z-10 px-4 pt-4">

            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(191,0,255,0.1)', border: '1px solid rgba(191,0,255,0.3)' }}>
                  <Icon name="key" size={28} color="#bf00ff" strokeWidth={1.5} />
                </div>
              </div>
              <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">ENTER ROOM CODE</p>
            </div>

            <input type="text" value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
              placeholder="ABC123" maxLength={6} autoCapitalize="characters"
              className="w-full bg-transparent border border-gray-700 rounded-2xl px-5 py-5 mb-5
                         font-orbitron text-3xl text-white placeholder-gray-800 tracking-[0.5em] text-center
                         focus:outline-none focus:border-arcade-purple transition-all" />

            {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-3">{error}</p>}

            <motion.button whileTap={{ scale: 0.96 }} onClick={joinRoom} disabled={loading}
              className="w-full py-4 rounded-2xl font-orbitron text-sm font-black tracking-widest mb-3 flex items-center justify-center gap-2"
              style={{ background: 'rgba(191,0,255,0.1)', border: '1px solid #bf00ff', color: loading ? '#555' : '#bf00ff' }}>
              <Icon name="key" size={16} color={loading ? '#555' : '#bf00ff'} strokeWidth={2} />
              {loading ? 'JOINING...' : 'JOIN ROOM'}
            </motion.button>

            <button onClick={() => setScreen('menu')}
              className="w-full py-2 font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
              ← BACK
            </button>
          </motion.div>
        )}

        {/* ── LOBBY ── */}
        {screen === 'lobby' && room && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="relative z-10 px-4 pt-2">

            {/* Series scoreboard (multi-round) */}
            {rounds.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 mb-4 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="font-orbitron text-[8px] text-gray-600 tracking-widest text-center mb-3">
                  SERIES — ROUND {rounds.length + 1}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center">
                    <p className="font-orbitron text-[9px] text-gray-600 mb-1">
                      {isHost ? user.username?.toUpperCase() : room.host_username?.toUpperCase()}
                    </p>
                    <p className="font-orbitron text-4xl font-black" style={{ color: '#00f5ff' }}>
                      {isHost ? seriesScore.me : seriesScore.opp}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-orbitron text-xs text-gray-700">WINS</p>
                    {seriesScore.draws > 0 &&
                      <p className="font-rajdhani text-[9px] text-gray-700 mt-1">{seriesScore.draws} draw{seriesScore.draws > 1 ? 's' : ''}</p>
                    }
                  </div>
                  <div className="text-center">
                    <p className="font-orbitron text-[9px] text-gray-600 mb-1">
                      {isHost ? room.guest_username?.toUpperCase() : user.username?.toUpperCase()}
                    </p>
                    <p className="font-orbitron text-4xl font-black" style={{ color: '#bf00ff' }}>
                      {isHost ? seriesScore.opp : seriesScore.me}
                    </p>
                  </div>
                </div>
                {/* Mini round history */}
                <div className="flex gap-1.5 flex-wrap">
                  {rounds.map((r, i) => {
                    const rg = GAME_REGISTRY[r.game]
                    const wonRound = r.won === true
                    const lostRound = r.won === false
                    return (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg"
                        style={{ background: wonRound ? 'rgba(0,255,136,0.1)' : lostRound ? 'rgba(255,0,110,0.08)' : 'rgba(255,215,0,0.08)',
                                 border: `1px solid ${wonRound ? 'rgba(0,255,136,0.3)' : lostRound ? 'rgba(255,0,110,0.25)' : 'rgba(255,215,0,0.25)'}` }}>
                        <GameIcon id={r.game} size={11} color={rg?.color || '#666'} strokeWidth={1.5} />
                        <span className="font-orbitron text-[8px]"
                          style={{ color: wonRound ? '#00ff88' : lostRound ? '#ff006e' : '#ffd700' }}>
                          {wonRound ? 'W' : lostRound ? 'L' : 'D'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Code */}
            <div className="text-center mb-6">
              <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-3">
                {isHost ? 'SHARE THIS CODE WITH YOUR FRIEND' : 'ROOM CODE'}
              </p>
              <motion.button onClick={copyCode} whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl transition-all"
                style={{ background: 'rgba(0,245,255,0.06)', border: '2px solid rgba(0,245,255,0.35)' }}>
                <span className="font-orbitron text-4xl font-black tracking-[0.25em]" style={{ color: '#00f5ff' }}>
                  {room.code}
                </span>
                <Icon name="copy" size={16} color={copied ? '#00ff88' : '#333'} strokeWidth={1.5} />
              </motion.button>
              {copied && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="font-rajdhani text-xs mt-2" style={{ color: '#00ff88' }}>
                  Copied to clipboard
                </motion.p>
              )}
            </div>

            {/* Game badge */}
            {(() => {
              const g = GAME_REGISTRY[room.game]
              return (
                <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2.5 rounded-xl w-fit mx-auto"
                  style={{ background: `${g.color}12`, border: `1px solid ${g.border}` }}>
                  <GameIcon id={g.id} size={16} color={g.color} strokeWidth={1.5} />
                  <span className="font-orbitron text-xs font-bold" style={{ color: g.color }}>{g.label}</span>
                </div>
              )
            })()}

            {/* Players */}
            <div className="flex items-stretch gap-4 mb-6">
              <PlayerCard name={room.host_username} avatar={room.host_avatar} label="HOST" color="#00f5ff" />
              <div className="flex items-center justify-center flex-shrink-0">
                <Icon name="swords" size={20} color="#2a2a3a" strokeWidth={1.5} />
              </div>
              {room.guest_id
                ? <PlayerCard name={room.guest_username} avatar={room.guest_avatar} label="GUEST" color="#bf00ff" />
                : <WaitingCard />
              }
            </div>

            {isHost ? (
              !room.guest_id ? (
                /* No guest yet */
                <div className="text-center py-4">
                  <PulsingDots color="#00f5ff" />
                  <p className="font-rajdhani text-sm text-gray-500 mt-2 mb-4">Waiting for opponent to join...</p>
                </div>
              ) : room.status === 'guest_ready' ? (
                /* Guest is ready — host can start */
                <motion.button whileTap={{ scale: 0.96 }} onClick={startGame}
                  className="w-full py-4 rounded-2xl font-orbitron text-sm font-black tracking-widest mb-3 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88', color: '#00ff88', boxShadow: '0 0 40px rgba(0,255,136,0.2)' }}>
                  <Icon name="plus" size={16} color="#00ff88" strokeWidth={2.5} />
                  START GAME
                </motion.button>
              ) : (
                /* Guest joined but hasn't readied up yet */
                <div className="text-center py-5 rounded-2xl mb-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <PulsingDots color="#bf00ff" />
                  <p className="font-rajdhani text-sm text-gray-500 mt-2">Waiting for opponent to ready up...</p>
                </div>
              )
            ) : (
              !room.guest_id ? (
                /* Still joining */
                <div className="text-center py-4">
                  <PulsingDots color="#bf00ff" />
                  <p className="font-rajdhani text-sm text-gray-500 mt-2 mb-4">Joining room...</p>
                </div>
              ) : room.status === 'guest_ready' ? (
                /* Already readied — waiting for host */
                <div className="text-center py-5 rounded-2xl mb-3"
                  style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.25)' }}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: '#00ff88', boxShadow: '0 0 8px #00ff88' }} />
                    <p className="font-orbitron text-xs font-black" style={{ color: '#00ff88' }}>READY</p>
                  </div>
                  <p className="font-rajdhani text-sm text-gray-500">Waiting for host to start...</p>
                </div>
              ) : (
                /* Guest needs to ready up */
                <motion.button whileTap={{ scale: 0.96 }} onClick={readyUp}
                  className="w-full py-4 rounded-2xl font-orbitron text-sm font-black tracking-widest mb-3 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(191,0,255,0.1)', border: '1px solid #bf00ff', color: '#bf00ff', boxShadow: '0 0 40px rgba(191,0,255,0.15)' }}>
                  <Icon name="check" size={16} color="#bf00ff" strokeWidth={2.5} />
                  READY UP
                </motion.button>
              )
            )}

            <button onClick={leaveRoom}
              className="w-full py-2.5 rounded-xl font-orbitron text-[10px] tracking-widest transition-colors flex items-center justify-center gap-2"
              style={{ border: '1px solid rgba(255,0,110,0.2)', color: 'rgba(255,0,110,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.color='#ff006e'; e.currentTarget.style.borderColor='rgba(255,0,110,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.color='rgba(255,0,110,0.4)'; e.currentTarget.style.borderColor='rgba(255,0,110,0.2)' }}>
              <Icon name="x" size={11} color="currentColor" strokeWidth={2} />
              LEAVE ROOM
            </button>
          </motion.div>
        )}

        {/* ── VS SCREEN ── */}
        {screen === 'vsscreen' && room && (
          <motion.div key="vsscreen" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-[78vh] px-4">

            {/* Game label */}
            {(() => {
              const g = GAME_REGISTRY[room.game]
              return (
                <div className="flex items-center gap-2 mb-10 px-4 py-2 rounded-xl"
                  style={{ background: `${g.color}14`, border: `1px solid ${g.border}` }}>
                  <GameIcon id={g.id} size={14} color={g.color} strokeWidth={1.5} />
                  <span className="font-orbitron text-xs font-bold" style={{ color: g.color }}>{g.label}</span>
                </div>
              )
            })()}

            {/* Player VS layout */}
            <div className="flex items-center gap-6 w-full max-w-xs">
              {/* Me */}
              <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 180 }}
                className="flex-1 flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
                  style={{ background: 'rgba(0,245,255,0.1)', border: '2px solid rgba(0,245,255,0.45)', boxShadow: '0 0 30px rgba(0,245,255,0.15)' }}>
                  {user.avatar}
                </div>
                <p className="font-orbitron text-xs font-black truncate max-w-[90px] text-center" style={{ color: '#00f5ff' }}>
                  {user.username?.toUpperCase()}
                </p>
              </motion.div>

              {/* VS */}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 220 }}
                className="flex flex-col items-center gap-1 flex-shrink-0">
                <p className="font-orbitron text-4xl font-black"
                  style={{ color: '#fff', textShadow: '0 0 30px rgba(255,0,110,0.9), 0 0 60px rgba(255,0,110,0.4)' }}>
                  VS
                </p>
              </motion.div>

              {/* Opponent */}
              <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 180 }}
                className="flex-1 flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
                  style={{ background: 'rgba(191,0,255,0.1)', border: '2px solid rgba(191,0,255,0.45)', boxShadow: '0 0 30px rgba(191,0,255,0.15)' }}>
                  {isHost ? room.guest_avatar : room.host_avatar}
                </div>
                <p className="font-orbitron text-xs font-black truncate max-w-[90px] text-center" style={{ color: '#bf00ff' }}>
                  {(isHost ? room.guest_username : room.host_username)?.toUpperCase()}
                </p>
              </motion.div>
            </div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
              className="font-orbitron text-[10px] text-gray-600 tracking-widest mt-10">
              GET READY...
            </motion.p>
          </motion.div>
        )}

        {/* ── COUNTDOWN ── */}
        {screen === 'countdown' && room && (
          <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-3xl">{user.avatar}</span>
              <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">VS</p>
              <span className="text-3xl">{isHost ? room.guest_avatar : room.host_avatar}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={countdown}
                initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.38 }}
                className="font-orbitron font-black text-center"
                style={{ fontSize: 128, lineHeight: 1,
                  color: countdown > 0 ? '#00f5ff' : '#00ff88',
                  textShadow: countdown > 0 ? '0 0 60px rgba(0,245,255,0.9)' : '0 0 60px rgba(0,255,136,0.9)',
                }}>
                {countdown > 0 ? countdown : 'FIGHT!'}
              </motion.div>
            </AnimatePresence>
            {(() => {
              const g = GAME_REGISTRY[room.game]
              return (
                <div className="flex items-center gap-2 mt-10">
                  <GameIcon id={g.id} size={16} color={g.color} strokeWidth={1.5} />
                  <p className="font-orbitron text-sm" style={{ color: g.color }}>{g.label}</p>
                </div>
              )
            })()}
          </motion.div>
        )}

        {/* ── PLAYING ── */}
        {screen === 'playing' && GameComp && (
          <div key="playing" className="relative z-10">
            {/* Slim battle banner */}
            <div className="flex items-center justify-between px-3 py-1.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{user.avatar}</span>
                <span className="font-orbitron text-[10px] font-black" style={{ color: '#00f5ff' }}>
                  {user.username?.toUpperCase()}
                </span>
                {rounds.length > 0 && (
                  <span className="font-orbitron text-[10px] font-black ml-1" style={{ color: '#00f5ff' }}>
                    {seriesScore.me}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff006e', boxShadow: '0 0 6px #ff006e' }} />
                <span className="font-orbitron text-[9px] text-gray-600 tracking-widest">LIVE</span>
              </div>
              <div className="flex items-center gap-1.5">
                {rounds.length > 0 && (
                  <span className="font-orbitron text-[10px] font-black" style={{ color: '#bf00ff' }}>
                    {seriesScore.opp}
                  </span>
                )}
                <span className="font-orbitron text-[10px] font-black" style={{ color: '#bf00ff' }}>
                  {(isHost ? room.guest_username : room.host_username)?.toUpperCase()}
                </span>
                <span className="text-base leading-none">{isHost ? room.guest_avatar : room.host_avatar}</span>
              </div>
            </div>

            <GameComp onFinish={handleGameFinish} difficulty="medium" />

            <div className="px-4 pb-3 pt-1">
              <button onClick={() => setShowQuitConfirm(true)}
                className="w-full py-1.5 rounded-lg font-orbitron text-[9px] tracking-widest transition-all"
                style={{ color: 'rgba(255,0,110,0.22)', letterSpacing: '0.1em' }}>
                forfeit
              </button>
            </div>
          </div>
        )}


        {/* ── WAITING ── */}
        {screen === 'waiting' && room && (() => {
          const oppName   = isHost ? room.guest_username : room.host_username
          const oppAvatar = isHost ? room.guest_avatar   : room.host_avatar
          return (
            <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="relative z-10 px-4 pt-6">

              {/* Your score */}
              <div className="text-center mb-8">
                <p className="font-orbitron text-[9px] text-gray-600 tracking-widest mb-4">YOUR SCORE IS LOCKED</p>
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                  className="inline-block px-10 py-6 rounded-3xl mb-4"
                  style={{ background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.3)', boxShadow: '0 0 40px rgba(0,245,255,0.1)' }}>
                  <p className="font-orbitron text-6xl font-black"
                    style={{ color: '#00f5ff', textShadow: '0 0 40px rgba(0,245,255,0.5)' }}>
                    {myScore?.toLocaleString()}
                  </p>
                </motion.div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00ff88' }} />
                  <p className="font-orbitron text-[9px]" style={{ color: '#00ff88' }}>LOCKED IN</p>
                </div>
              </div>

              {/* Opponent card */}
              <div className="rounded-2xl p-6 text-center"
                style={{ background: 'rgba(191,0,255,0.06)', border: '1px solid rgba(191,0,255,0.2)' }}>
                <div className="text-3xl mb-2">{oppAvatar}</div>
                <p className="font-orbitron text-xs font-bold text-gray-300 mb-4">{oppName}</p>
                <PulsingDots color="#bf00ff" />
                <p className="font-orbitron text-[9px] text-gray-600 tracking-widest mt-3">STILL PLAYING...</p>
              </div>

              {/* Escape hatch if stuck too long */}
              {waitingTooLong && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.25)' }}>
                  <p className="font-rajdhani text-xs text-gray-500 mb-3">Taking longer than expected...</p>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      const { data } = await supabase.from('rooms').select('*').eq('id', room.id).maybeSingle()
                      if (data) setRoom(data)
                    }}
                      className="flex-1 py-2.5 rounded-xl font-orbitron text-[10px] tracking-widest"
                      style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.4)', color: '#ffd700' }}>
                      CHECK STATUS
                    </button>
                    <button onClick={goHome}
                      className="py-2.5 px-4 rounded-xl font-orbitron text-[10px]"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#444' }}>
                      LEAVE
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })()}

        {/* ── RESULTS ── */}
        {screen === 'results' && room && (() => {
          const hostScore     = room.host_score  ?? 0
          const guestScore    = room.guest_score ?? 0
          const myFinalScore  = isHost ? hostScore  : guestScore
          const oppFinalScore = isHost ? guestScore : hostScore
          const oppName       = isHost ? room.guest_username : room.host_username
          const oppAvatar     = isHost ? room.guest_avatar   : room.host_avatar
          const iForfeited    = myFinalScore  === -1
          const oppForfeited  = oppFinalScore === -1
          const displayMyScore  = iForfeited  ? 0 : myFinalScore
          const displayOppScore = oppForfeited ? 0 : oppFinalScore
          const iWon   = !iForfeited && (oppForfeited || myFinalScore > oppFinalScore)
          const isDraw = !iForfeited && !oppForfeited && myFinalScore === oppFinalScore
          const g      = GAME_REGISTRY[room.game]
          const total  = displayMyScore + displayOppScore || 1
          const myPct  = Math.round((displayMyScore / total) * 100)
          const oppPct = 100 - myPct
          const diff   = Math.abs(displayMyScore - displayOppScore)
          const outcomeColor = isDraw ? '#ffd700' : iWon ? '#00ff88' : '#ff006e'
          const outcomeLabel = isDraw ? "IT'S A DRAW"
                             : iWon  ? (oppForfeited ? 'OPPONENT QUIT' : 'VICTORY')
                                     : (iForfeited    ? 'FORFEITED'     : 'DEFEATED')

          return (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="relative z-10 px-4 pt-2 pb-6">

              {/* ── Outcome banner ── */}
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.05 }}
                className="text-center rounded-2xl py-6 mb-4"
                style={{ background: `${outcomeColor}0d`, border: `1px solid ${outcomeColor}35`, boxShadow: `0 0 40px ${outcomeColor}12` }}>

                {/* Icon */}
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 250, delay: 0.15 }}
                  className="flex items-center justify-center mb-3">
                  {iWon ? (
                    <Icon name="trophy" size={40} color={outcomeColor} strokeWidth={1.5} />
                  ) : isDraw ? (
                    <Icon name="swords" size={40} color={outcomeColor} strokeWidth={1.5} />
                  ) : (
                    <Icon name="x" size={36} color={outcomeColor} strokeWidth={1.5} />
                  )}
                </motion.div>

                <h2 className="font-orbitron text-3xl font-black"
                  style={{ color: outcomeColor, textShadow: `0 0 24px ${outcomeColor}70` }}>
                  {outcomeLabel}
                </h2>

                {/* Game label */}
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <GameIcon id={g.id} size={12} color={g.color} strokeWidth={1.5} />
                  <p className="font-orbitron text-[10px]" style={{ color: g.color }}>{g.label}</p>
                </div>
              </motion.div>

              {/* ── Head-to-head ── */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="rounded-2xl p-4 mb-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>

                <p className="font-orbitron text-[9px] text-gray-600 tracking-widest text-center mb-4">
                  HEAD TO HEAD
                </p>

                {/* Player avatars + names */}
                <div className="flex items-start gap-2 mb-5">
                  {/* Me */}
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl relative"
                      style={{
                        background: iWon ? 'rgba(0,255,136,0.1)' : isDraw ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${iWon ? '#00ff88' : isDraw ? '#ffd700' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      {user.avatar}
                      {iWon && (
                        <div className="absolute -top-2 -right-2">
                          <Icon name="crown" size={16} color="#ffd700" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <p className="font-orbitron text-[9px] text-gray-400 truncate max-w-[72px] text-center">
                      YOU
                    </p>
                    <p className="font-orbitron text-2xl font-black"
                      style={{ color: iWon ? '#00ff88' : isDraw ? '#ffd700' : '#ff006e' }}>
                      {iForfeited ? '—' : <CountUp target={displayMyScore} duration={900} delay={0.3} />}
                    </p>
                  </div>

                  {/* VS divider */}
                  <div className="flex flex-col items-center pt-4 gap-1">
                    <span className="font-orbitron text-xs text-gray-700 font-black">VS</span>
                    {!isDraw && !iForfeited && !oppForfeited && (
                      <span className="font-rajdhani text-[9px] text-gray-600 text-center">
                        by {diff.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Opponent */}
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl relative"
                      style={{
                        background: !iWon && !isDraw ? 'rgba(0,255,136,0.1)' : isDraw ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${!iWon && !isDraw ? '#00ff88' : isDraw ? '#ffd700' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      {oppAvatar}
                      {!iWon && !isDraw && (
                        <div className="absolute -top-2 -right-2">
                          <Icon name="crown" size={16} color="#ffd700" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <p className="font-orbitron text-[9px] text-gray-400 truncate max-w-[72px] text-center">
                      {oppName?.toUpperCase()}
                    </p>
                    <p className="font-orbitron text-2xl font-black"
                      style={{ color: !iWon && !isDraw ? '#00ff88' : isDraw ? '#ffd700' : '#ff006e' }}>
                      {oppForfeited ? '—' : <CountUp target={displayOppScore} duration={900} delay={0.5} />}
                    </p>
                  </div>
                </div>

                {/* Score share bar */}
                <div className="flex h-2.5 rounded-full overflow-hidden gap-px mb-1">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${myPct}%` }}
                    transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                    style={{
                      background: iWon ? '#00ff88' : isDraw ? '#ffd700' : '#ff006e',
                      borderRadius: '999px 0 0 999px',
                      boxShadow: `0 0 8px ${iWon ? '#00ff88' : isDraw ? '#ffd700' : '#ff006e'}60`,
                    }} />
                  <motion.div initial={{ width: 0 }} animate={{ width: `${oppPct}%` }}
                    transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                    style={{
                      background: !iWon && !isDraw ? '#00ff88' : isDraw ? '#ffd700' : 'rgba(255,0,110,0.5)',
                      borderRadius: '0 999px 999px 0',
                    }} />
                </div>
                <div className="flex justify-between">
                  <span className="font-orbitron text-[9px]" style={{ color: '#444' }}>{myPct}%</span>
                  <span className="font-orbitron text-[9px]" style={{ color: '#444' }}>{oppPct}%</span>
                </div>
              </motion.div>

              {/* ── XP earned ── */}
              {rewardInfo && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-2xl p-4 mb-3"
                  style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)' }}>
                  <div className="flex items-center justify-between">
                    <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">XP EARNED</p>
                    <p className="font-orbitron text-xl font-black neon-text-cyan">+{rewardInfo.xpEarned}</p>
                  </div>
                  {rewardInfo.leveledUp && (
                    <div className="text-center mt-2">
                      <span className="font-orbitron text-[10px] px-3 py-1 rounded-full"
                        style={{ background: 'rgba(255,215,0,0.15)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.4)' }}>
                        LEVEL UP — LV.{rewardInfo.newLevel}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Series score ── */}
              {rounds.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="rounded-2xl p-4 mb-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="font-orbitron text-[9px] text-gray-600 tracking-widest text-center mb-3">
                    SERIES — {rounds.length} ROUND{rounds.length > 1 ? 'S' : ''}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-center">
                      <p className="font-orbitron text-[9px] text-gray-600 mb-1">YOU</p>
                      <p className="font-orbitron text-3xl font-black"
                        style={{ color: seriesScore.me > seriesScore.opp ? '#00ff88' : seriesScore.me < seriesScore.opp ? '#ff006e' : '#ffd700' }}>
                        {seriesScore.me}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-orbitron text-xs text-gray-700">WINS</p>
                      {seriesScore.draws > 0 &&
                        <p className="font-rajdhani text-[9px] text-gray-600 mt-1">{seriesScore.draws}D</p>
                      }
                    </div>
                    <div className="text-center">
                      <p className="font-orbitron text-[9px] text-gray-600 mb-1">{oppName?.toUpperCase()}</p>
                      <p className="font-orbitron text-3xl font-black"
                        style={{ color: seriesScore.opp > seriesScore.me ? '#00ff88' : seriesScore.opp < seriesScore.me ? '#ff006e' : '#ffd700' }}>
                        {seriesScore.opp}
                      </p>
                    </div>
                  </div>
                  {/* Per-round history */}
                  <div className="flex flex-col gap-1.5">
                    {rounds.map((r, i) => {
                      const rg = GAME_REGISTRY[r.game]
                      const myR   = r.myScore  === -1 ? 0 : r.myScore
                      const oppR  = r.oppScore === -1 ? 0 : r.oppScore
                      const wonR  = r.won === true
                      const lostR = r.won === false
                      const rc    = wonR ? '#00ff88' : lostR ? '#ff006e' : '#ffd700'
                      return (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                          style={{ background: `${rc}08`, border: `1px solid ${rc}22` }}>
                          <GameIcon id={r.game} size={12} color={rg?.color || '#666'} strokeWidth={1.5} />
                          <span className="font-rajdhani text-[10px] text-gray-500 flex-1">{rg?.label}</span>
                          <span className="font-orbitron text-[10px]" style={{ color: rc }}>
                            {myR.toLocaleString()} – {oppR.toLocaleString()}
                          </span>
                          <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{ background: `${rc}20`, color: rc }}>
                            {wonR ? 'W' : lostR ? 'L' : 'D'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Series Champion Banner ── */}
              {seriesOver && (
                <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                  className="rounded-2xl p-5 mb-4 text-center"
                  style={{
                    background: seriesChampion === 'me' ? 'rgba(255,215,0,0.08)' : 'rgba(255,0,110,0.06)',
                    border: `1px solid ${seriesChampion === 'me' ? 'rgba(255,215,0,0.5)' : 'rgba(255,0,110,0.35)'}`,
                    boxShadow: seriesChampion === 'me' ? '0 0 40px rgba(255,215,0,0.12)' : 'none',
                  }}>
                  <Icon name="trophy" size={28} color={seriesChampion === 'me' ? '#ffd700' : '#ff006e'} strokeWidth={1.5} />
                  <p className="font-orbitron text-xs font-black mt-2"
                    style={{ color: seriesChampion === 'me' ? '#ffd700' : '#ff006e' }}>
                    {seriesChampion === 'me' ? 'SERIES CHAMPION!' : `${(isHost ? room.guest_username : room.host_username)?.toUpperCase()} WINS THE SERIES`}
                  </p>
                  <p className="font-rajdhani text-xs text-gray-500 mt-1">
                    First to {SERIES_WIN} wins — series complete
                  </p>
                </motion.div>
              )}

              {/* ── Actions ── */}
              {isHost ? (
                seriesOver ? (
                  <div className="flex gap-3">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={playAgain}
                      className="flex-1 py-3.5 rounded-2xl font-orbitron text-xs font-bold tracking-wider flex items-center justify-center gap-2"
                      style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid #00f5ff', color: '#00f5ff' }}>
                      <Icon name="refresh" size={14} color="#00f5ff" strokeWidth={2} />
                      NEW SERIES
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={goHome}
                      className="py-3.5 px-4 rounded-2xl font-orbitron text-xs tracking-wider flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#555' }}>
                      <Icon name="home" size={15} color="#555" strokeWidth={1.5} />
                    </motion.button>
                  </div>
                ) : showNextPicker ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="font-orbitron text-[9px] text-gray-600 tracking-widest text-center mb-3">
                      PICK NEXT GAME
                    </p>
                    <div className="flex flex-col gap-2 mb-3">
                      {GAME_LIST.map(gm => {
                        const sel = nextGameChoice === gm.id
                        return (
                          <button key={gm.id} onClick={() => setNextGameChoice(gm.id)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                            style={{
                              background: sel ? `${gm.color}14` : 'rgba(255,255,255,0.03)',
                              border:    `1px solid ${sel ? gm.border : 'rgba(255,255,255,0.08)'}`,
                            }}>
                            <GameIcon id={gm.id} size={16} color={gm.color} strokeWidth={1.5} />
                            <span className="font-orbitron text-xs flex-1" style={{ color: sel ? gm.color : '#666' }}>
                              {gm.label}
                            </span>
                            {sel && <Icon name="check" size={13} color={gm.color} strokeWidth={2.5} />}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex gap-3">
                      <motion.button whileTap={{ scale: 0.96 }} onClick={nextRound} disabled={loading}
                        className="flex-1 py-3.5 rounded-2xl font-orbitron text-xs font-bold tracking-wider flex items-center justify-center gap-2"
                        style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid #00ff88', color: loading ? '#555' : '#00ff88' }}>
                        <Icon name="plus" size={14} color={loading ? '#555' : '#00ff88'} strokeWidth={2.5} />
                        {loading ? 'STARTING...' : 'START ROUND'}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowNextPicker(false)}
                        className="py-3.5 px-4 rounded-2xl font-orbitron text-xs tracking-wider flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#555' }}>
                        <Icon name="x" size={14} color="#555" strokeWidth={2} />
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex gap-3">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowNextPicker(true)}
                      className="flex-1 py-3.5 rounded-2xl font-orbitron text-xs font-bold tracking-wider flex items-center justify-center gap-2"
                      style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid #00f5ff', color: '#00f5ff' }}>
                      <Icon name="plus" size={14} color="#00f5ff" strokeWidth={2.5} />
                      NEXT GAME
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={playAgain}
                      className="py-3.5 px-4 rounded-2xl font-orbitron text-xs tracking-wider flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#555' }}>
                      <Icon name="refresh" size={15} color="#555" strokeWidth={1.5} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={goHome}
                      className="py-3.5 px-4 rounded-2xl font-orbitron text-xs tracking-wider flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#555' }}>
                      <Icon name="home" size={15} color="#555" strokeWidth={1.5} />
                    </motion.button>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  {!seriesOver && (
                    <div className="py-3 rounded-xl text-center"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <p className="font-rajdhani text-xs text-gray-600">Waiting for host to start next round...</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={goHome}
                      className="flex-1 py-3.5 rounded-2xl font-orbitron text-xs tracking-wider flex items-center justify-center gap-2"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#666' }}>
                      <Icon name="home" size={14} color="#666" strokeWidth={1.5} />
                      {seriesOver ? 'EXIT' : 'LEAVE SERIES'}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })()}

      </AnimatePresence>

      {/* ── QUIT CONFIRM MODAL (outside AnimatePresence) ── */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div
            key="quitModal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.88)' }}>
            <motion.div initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 240 }}
              className="w-full max-w-xs rounded-2xl p-6 text-center"
              style={{ background: '#0e0e1e', border: '1px solid rgba(255,0,110,0.45)', boxShadow: '0 0 40px rgba(255,0,110,0.15)' }}>
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,0,110,0.1)', border: '1px solid rgba(255,0,110,0.35)' }}>
                  <Icon name="x" size={28} color="#ff006e" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-orbitron text-base font-black text-white mb-2">LEAVE BATTLE?</h3>
              <p className="font-rajdhani text-sm text-gray-400 mb-6 leading-relaxed">
                This will count as a loss — your opponent wins this round automatically.
              </p>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowQuitConfirm(false); forfeit() }}
                  className="flex-1 py-3 rounded-xl font-orbitron text-xs font-black tracking-widest"
                  style={{ background: 'rgba(255,0,110,0.12)', border: '1px solid #ff006e', color: '#ff006e' }}>
                  LEAVE
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-orbitron text-xs font-black tracking-widest"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#666' }}>
                  CANCEL
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function PlayerCard({ name, avatar, label, color }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl"
      style={{ background: `${color}08`, border: `1px solid ${color}30` }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: `${color}14`, border: `1px solid ${color}44` }}>
        {avatar}
      </div>
      <p className="font-orbitron text-xs font-bold truncate max-w-[80px]" style={{ color }}>{name}</p>
      <span className="font-orbitron text-[8px] px-2 py-0.5 rounded-full"
        style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}>
        {label}
      </span>
    </div>
  )
}

function WaitingCard() {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <motion.div animate={{ opacity: [0.25, 0.9, 0.25] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <Icon name="person" size={24} color="#2a2a3a" strokeWidth={1.5} />
        </motion.div>
      </div>
      <p className="font-orbitron text-[10px] text-gray-700">WAITING...</p>
    </div>
  )
}

function PulsingDots({ color }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }} />
      ))}
    </div>
  )
}
