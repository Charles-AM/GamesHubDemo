import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useUser, ACHIEVEMENTS } from '../context/UserContext'
import { GAME_LIST, GAME_REGISTRY } from '../games/gameRegistry'

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function GameRoom() {
  const { user, recordGame } = useUser()
  const navigate = useNavigate()

  const [screen,       setScreen]       = useState('menu')
  const [room,         setRoom]         = useState(null)
  const [isHost,       setIsHost]       = useState(false)
  const [joinCode,     setJoinCode]     = useState('')
  const [selectedGame, setSelectedGame] = useState('trivia')
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [countdown,    setCountdown]    = useState(3)
  const [myScore,      setMyScore]      = useState(null)
  const [rewardInfo,   setRewardInfo]   = useState(null)
  const [scoreSent,    setScoreSent]    = useState(false)
  const [copied,       setCopied]       = useState(false)

  const channelRef  = useRef(null)
  const rewardRef   = useRef(false)
  const screenRef   = useRef('menu')

  useEffect(() => { screenRef.current = screen }, [screen])

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

  // React to room state changes from Realtime
  useEffect(() => {
    if (!room) return

    if (room.status === 'playing' && screenRef.current === 'lobby') {
      setScreen('countdown')
      let n = 3
      setCountdown(n)
      const t = setInterval(() => {
        n--
        setCountdown(n)
        if (n <= 0) { clearInterval(t); setScreen('playing') }
      }, 1000)
      return () => clearInterval(t)
    }

    if (room.status === 'finished' && screenRef.current !== 'results') {
      setScreen('results')
    }

    // Both scores in — either client marks finished (idempotent)
    if (room.status === 'playing' && room.host_score !== null && room.guest_score !== null) {
      supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id)
    }
  }, [room])

  // Award XP exactly once when results load
  useEffect(() => {
    if (screen !== 'results' || !room || rewardRef.current) return
    const mySc  = isHost ? room.host_score  : room.guest_score
    const oppSc = isHost ? room.guest_score : room.host_score
    if (mySc === null || oppSc === null) return
    rewardRef.current = true
    const won = mySc > oppSc ? true : mySc < oppSc ? false : null
    recordGame({
      game: room.game, score: mySc,
      mode: 'versus', won,
      p2Name:  isHost ? room.guest_username : room.host_username,
      p2Score: oppSc,
    }).then(info => setRewardInfo(info))
  }, [screen, room, isHost, recordGame])

  // ── Actions ────────────────────────────────────────────────
  const createRoom = async () => {
    setLoading(true); setError('')
    try {
      const { data, error: err } = await supabase.from('rooms').insert({
        code: genCode(), game: selectedGame, status: 'waiting',
        host_id: user.id, host_username: user.username, host_avatar: user.avatar,
      }).select().maybeSingle()
      if (err) throw err
      setRoom(data); setIsHost(true); setScreen('lobby')
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
      subscribeToRoom(data.id)
    } catch (e) { setError(e.message || 'Failed to join room') }
    finally { setLoading(false) }
  }

  const startGame = async () => {
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

  const playAgain = () => {
    setRoom(null); setIsHost(false); setMyScore(null)
    setRewardInfo(null); setScoreSent(false); rewardRef.current = false
    setCopied(false); setScreen('create')
  }

  const goHome = () => { channelRef.current?.unsubscribe(); navigate('/hub') }

  const GameComp = room ? GAME_REGISTRY[room.game]?.component : null

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden">

      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-cyan"   style={{ top: '-5%',  left: '-10%' }} />
        <div className="orb orb-purple" style={{ bottom: '8%', right: '-8%' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={goHome}
          className="font-orbitron text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
          ← HUB
        </button>
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">⚔ BATTLE ROOM</p>
      </div>

      <AnimatePresence mode="wait">

        {/* ── MENU ── */}
        {screen === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="relative z-10 px-4 pt-4">

            <div className="text-center mb-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="text-6xl mb-4">⚔️</motion.div>
              <h1 className="font-orbitron text-2xl font-black neon-text-cyan mb-2">BATTLE ROOM</h1>
              <p className="font-rajdhani text-sm text-gray-500">Challenge a friend to a real-time duel</p>
            </div>

            <div className="flex flex-col gap-4">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen('create')}
                className="w-full py-6 rounded-2xl flex flex-col items-center gap-1"
                style={{ background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.4)', boxShadow: '0 0 30px rgba(0,245,255,0.08)' }}>
                <span className="text-3xl mb-1">🎮</span>
                <span className="font-orbitron text-sm font-black tracking-widest" style={{ color: '#00f5ff' }}>CREATE ROOM</span>
                <span className="font-rajdhani text-xs text-gray-500">Pick a game · Share the code</span>
              </motion.button>

              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen('join')}
                className="w-full py-6 rounded-2xl flex flex-col items-center gap-1"
                style={{ background: 'rgba(191,0,255,0.06)', border: '1px solid rgba(191,0,255,0.4)', boxShadow: '0 0 30px rgba(191,0,255,0.08)' }}>
                <span className="text-3xl mb-1">🔑</span>
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
              {GAME_LIST.map(g => (
                <button key={g.id} onClick={() => setSelectedGame(g.id)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left"
                  style={{
                    background:  selectedGame === g.id ? `${g.color}14` : 'rgba(255,255,255,0.03)',
                    border:     `1px solid ${selectedGame === g.id ? g.border : 'rgba(255,255,255,0.08)'}`,
                    boxShadow:   selectedGame === g.id ? `0 0 20px ${g.glow}` : 'none',
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${g.color}18`, border: `1px solid ${g.color}44` }}>
                    {g.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-orbitron text-xs font-bold" style={{ color: selectedGame === g.id ? g.color : '#aaa' }}>
                      {g.label}
                    </p>
                    <p className="font-rajdhani text-[11px] text-gray-500">{g.desc}</p>
                  </div>
                  {selectedGame === g.id && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 font-bold"
                      style={{ background: g.color, color: '#000' }}>✓</div>
                  )}
                </button>
              ))}
            </div>

            {error && <p className="text-arcade-pink text-xs font-rajdhani text-center mb-3">{error}</p>}

            <motion.button whileTap={{ scale: 0.96 }} onClick={createRoom} disabled={loading}
              className="w-full py-4 rounded-2xl font-orbitron text-sm font-black tracking-widest mb-3"
              style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid #00f5ff', color: loading ? '#555' : '#00f5ff' }}>
              {loading ? 'CREATING...' : '⚡ CREATE ROOM'}
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
              <div className="text-5xl mb-3">🔑</div>
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
              className="w-full py-4 rounded-2xl font-orbitron text-sm font-black tracking-widest mb-3"
              style={{ background: 'rgba(191,0,255,0.1)', border: '1px solid #bf00ff', color: loading ? '#555' : '#bf00ff' }}>
              {loading ? 'JOINING...' : '🔑 JOIN ROOM'}
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
                <span className="font-orbitron text-[10px]" style={{ color: copied ? '#00ff88' : '#444' }}>
                  {copied ? '✓' : '⎘'}
                </span>
              </motion.button>
              {copied && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="font-rajdhani text-xs mt-2" style={{ color: '#00ff88' }}>
                  Copied!
                </motion.p>
              )}
            </div>

            {/* Game badge */}
            {(() => {
              const g = GAME_REGISTRY[room.game]
              return (
                <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 rounded-xl w-fit mx-auto"
                  style={{ background: `${g.color}12`, border: `1px solid ${g.border}` }}>
                  <span>{g.icon}</span>
                  <span className="font-orbitron text-xs font-bold" style={{ color: g.color }}>{g.label}</span>
                </div>
              )
            })()}

            {/* Players */}
            <div className="flex items-stretch gap-4 mb-6">
              <PlayerCard name={room.host_username} avatar={room.host_avatar} label="HOST" color="#00f5ff" />
              <div className="flex items-center justify-center flex-shrink-0">
                <span className="font-orbitron text-2xl font-black text-gray-700">VS</span>
              </div>
              {room.guest_id
                ? <PlayerCard name={room.guest_username} avatar={room.guest_avatar} label="GUEST" color="#bf00ff" />
                : <WaitingCard />
              }
            </div>

            {isHost ? (
              room.guest_id ? (
                <motion.button whileTap={{ scale: 0.96 }} onClick={startGame}
                  className="w-full py-4 rounded-2xl font-orbitron text-sm font-black tracking-widest"
                  style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88', color: '#00ff88', boxShadow: '0 0 30px rgba(0,255,136,0.15)' }}>
                  ⚡ START GAME
                </motion.button>
              ) : (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#444' }}
                        animate={{ background: ['#333', '#00f5ff', '#333'] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }} />
                    ))}
                  </div>
                  <p className="font-rajdhani text-sm text-gray-500">Waiting for opponent to join...</p>
                </div>
              )
            ) : (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: '#444' }}
                      animate={{ background: ['#333', '#bf00ff', '#333'] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }} />
                  ))}
                </div>
                <p className="font-rajdhani text-sm text-gray-500">
                  {room.guest_id ? 'Waiting for host to start the game...' : 'Joining room...'}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── COUNTDOWN ── */}
        {screen === 'countdown' && room && (
          <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
            <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-8">
              vs {isHost ? room.guest_username : room.host_username}
            </p>
            <AnimatePresence mode="wait">
              <motion.div key={countdown}
                initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.4 }}
                className="font-orbitron font-black text-center"
                style={{ fontSize: 120, lineHeight: 1,
                  color: countdown > 0 ? '#00f5ff' : '#00ff88',
                  textShadow: countdown > 0 ? '0 0 60px rgba(0,245,255,0.8)' : '0 0 60px rgba(0,255,136,0.8)',
                }}>
                {countdown > 0 ? countdown : 'GO!'}
              </motion.div>
            </AnimatePresence>
            {(() => { const g = GAME_REGISTRY[room.game]; return (
              <p className="font-orbitron text-sm mt-8" style={{ color: g.color }}>{g.icon} {g.label}</p>
            )})()}
          </motion.div>
        )}

        {/* ── PLAYING ── */}
        {screen === 'playing' && GameComp && (
          <div key="playing" className="relative z-10">
            <div className="px-4 mb-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)' }}>
                <span className="font-orbitron text-[10px]" style={{ color: '#00f5ff' }}>
                  {user.avatar} {user.username}
                </span>
                <span className="font-orbitron text-[9px] text-gray-600">VS</span>
                <span className="font-orbitron text-[10px] text-gray-400">
                  {isHost ? room.guest_username : room.host_username}{' '}
                  {isHost ? room.guest_avatar  : room.host_avatar}
                </span>
              </div>
            </div>
            <GameComp onFinish={handleGameFinish} />
          </div>
        )}

        {/* ── WAITING ── */}
        {screen === 'waiting' && room && (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <motion.div className="text-6xl mb-6"
              animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              ⏳
            </motion.div>
            <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-3">YOUR SCORE</p>
            <p className="font-orbitron text-6xl font-black text-white mb-8">{myScore?.toLocaleString()}</p>
            <div className="flex items-center gap-2 mb-3">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full"
                  style={{ background: '#00f5ff' }}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} />
              ))}
            </div>
            <p className="font-rajdhani text-sm text-gray-500">
              Waiting for {isHost ? room.guest_username : room.host_username} to finish...
            </p>
          </motion.div>
        )}

        {/* ── RESULTS ── */}
        {screen === 'results' && room && (() => {
          const hostScore  = room.host_score  ?? 0
          const guestScore = room.guest_score ?? 0
          const myFinalScore  = isHost ? hostScore  : guestScore
          const oppFinalScore = isHost ? guestScore : hostScore
          const oppName   = isHost ? room.guest_username : room.host_username
          const oppAvatar = isHost ? room.guest_avatar  : room.host_avatar
          const iWon  = myFinalScore  > oppFinalScore
          const isDraw = myFinalScore === oppFinalScore
          const g = GAME_REGISTRY[room.game]

          return (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="relative z-10 px-4 pt-2">

              {/* Outcome */}
              <div className="text-center mb-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="text-6xl mb-3">
                  {isDraw ? '🤝' : iWon ? '🏆' : '😤'}
                </motion.div>
                <h2 className="font-orbitron text-2xl font-black mb-1"
                  style={{ color: isDraw ? '#ffd700' : iWon ? '#00ff88' : '#ff006e',
                    textShadow: `0 0 30px ${isDraw ? 'rgba(255,215,0,0.5)' : iWon ? 'rgba(0,255,136,0.5)' : 'rgba(255,0,110,0.5)'}` }}>
                  {isDraw ? 'IT\'S A DRAW' : iWon ? 'YOU WIN!' : 'YOU LOSE!'}
                </h2>
                <p className="font-orbitron text-xs" style={{ color: g.color }}>{g.icon} {g.label}</p>
              </div>

              {/* Score cards */}
              <div className="flex items-stretch gap-3 mb-5">
                <ScoreCard name={user.username} avatar={user.avatar} score={myFinalScore}
                  winner={iWon} draw={isDraw} you />
                <div className="flex items-center justify-center flex-shrink-0">
                  <span className="font-orbitron text-lg font-black text-gray-700">VS</span>
                </div>
                <ScoreCard name={oppName} avatar={oppAvatar} score={oppFinalScore}
                  winner={!iWon && !isDraw} draw={isDraw} />
              </div>

              {/* XP / achievements */}
              {rewardInfo && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl p-4 mb-5"
                  style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">XP EARNED</p>
                    <p className="font-orbitron text-xl font-black" style={{ color: '#00f5ff' }}>
                      +{rewardInfo.xpEarned}
                    </p>
                  </div>
                  {rewardInfo.leveledUp && (
                    <div className="text-center mt-2">
                      <span className="font-orbitron text-[10px] px-3 py-1 rounded-full"
                        style={{ background: 'rgba(255,215,0,0.15)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.4)' }}>
                        ⬆ LEVEL UP! Now LV.{rewardInfo.newLevel}
                      </span>
                    </div>
                  )}
                  {rewardInfo.unlocked?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {rewardInfo.unlocked.map(id => {
                        const a = ACHIEVEMENTS.find(x => x.id === id)
                        return a ? (
                          <span key={id} className="font-orbitron text-[9px] px-2 py-1 rounded-lg"
                            style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.3)' }}>
                            {a.icon} {a.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.96 }} onClick={playAgain}
                  className="flex-1 py-3.5 rounded-2xl font-orbitron text-xs font-bold tracking-wider"
                  style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid #00f5ff', color: '#00f5ff' }}>
                  🔄 REMATCH
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={goHome}
                  className="flex-1 py-3.5 rounded-2xl font-orbitron text-xs font-bold tracking-wider"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)', color: '#666' }}>
                  🏠 HUB
                </motion.button>
              </div>
            </motion.div>
          )
        })()}

      </AnimatePresence>
    </div>
  )
}

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
        style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}>{label}</span>
    </div>
  )
}

function WaitingCard() {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <motion.span className="text-2xl" animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}>👤</motion.span>
      </div>
      <p className="font-orbitron text-[10px] text-gray-700">WAITING...</p>
    </div>
  )
}

function ScoreCard({ name, avatar, score, winner, draw, you }) {
  const color = winner ? '#00ff88' : draw ? '#ffd700' : '#ff006e'
  return (
    <div className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl relative overflow-hidden"
      style={{
        background: (winner || draw) ? `${color}08` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${(winner || draw) ? color + '35' : 'rgba(255,255,255,0.08)'}`,
      }}>
      {you && (
        <span className="absolute top-2 right-2 font-orbitron text-[7px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(0,245,255,0.15)', color: '#00f5ff' }}>YOU</span>
      )}
      {winner && (
        <span className="absolute top-2 left-2 text-xs">👑</span>
      )}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mt-2"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {avatar}
      </div>
      <p className="font-orbitron text-[10px] text-gray-400 truncate max-w-[80px]">{name}</p>
      <p className="font-orbitron text-2xl font-black" style={{ color: (winner || draw) ? color : '#444' }}>
        {score.toLocaleString()}
      </p>
    </div>
  )
}
