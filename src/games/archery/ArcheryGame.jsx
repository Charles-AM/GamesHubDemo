import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'

const SHOTS  = 10
const RADIUS = 130  // target radius in px (260px diameter)

// Rings: inside → out. Each defines max radius fraction + points + color
const RINGS = [
  { r: 0.10, pts: 10, bg: '#ffd700' },
  { r: 0.22, pts: 9,  bg: '#ffd700' },
  { r: 0.38, pts: 8,  bg: '#cc2200' },
  { r: 0.54, pts: 7,  bg: '#cc2200' },
  { r: 0.68, pts: 6,  bg: '#0a0a2e' },
  { r: 0.80, pts: 5,  bg: '#0a0a2e' },
  { r: 0.91, pts: 4,  bg: '#c8c8c8' },
  { r: 1.00, pts: 2,  bg: '#a0a0a0' },
]

function getPoints(dx, dy) {
  const frac = Math.sqrt(dx * dx + dy * dy) / RADIUS
  if (frac > 1) return 0
  for (const ring of RINGS) { if (frac <= ring.r) return ring.pts }
  return 0
}

function randomWind() {
  const angle    = Math.random() * Math.PI * 2
  const strength = 0.25 + Math.random() * 0.75
  return { x: Math.cos(angle) * strength, y: Math.sin(angle) * strength, angle, strength }
}

function WindDots({ strength }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: Math.max(1, Math.round(strength * 4)) }, (_, i) => (
        <div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#00f5ff', opacity: 0.5 + i * 0.15 }} />
      ))}
    </div>
  )
}

export default function ArcheryGame({ onFinish }) {
  const { updateScore } = useUser()
  const navigate        = useNavigate()

  const [phase,      setPhase]      = useState('starting')
  const [shotsLeft,  setShotsLeft]  = useState(SHOTS)
  const [total,      setTotal]      = useState(0)
  const [marks,      setMarks]      = useState([])
  const [scores,     setScores]     = useState([])
  const [lastPts,    setLastPts]    = useState(null)
  const [wind,       setWind]       = useState(randomWind)

  // Refs — updated synchronously, no stale closures in RAF
  const crosshairRef  = useRef(null)
  const rafRef        = useRef(null)
  const tRef          = useRef(0)
  const posRef        = useRef({ x: 0, y: 0 })
  const phaseRef      = useRef('starting')
  const windRef       = useRef(wind)
  const shotsRef      = useRef(SHOTS)
  const totalRef      = useRef(0)
  const marksRef      = useRef([])
  const scoresRef     = useRef([])

  useEffect(() => { windRef.current = wind }, [wind])

  // ── RAF animation ──────────────────────────────────────────
  const animate = useCallback(() => {
    if (phaseRef.current !== 'aiming') return
    tRef.current += 0.022

    const t   = tRef.current
    const w   = windRef.current
    const shotN = SHOTS - shotsRef.current          // 0 on first shot, grows
    const amp   = 55 + shotN * 5                    // wobble increases with each shot
    const freq  = 1 + shotN * 0.04                  // slightly faster over time

    let x = Math.sin(t * 1.7 * freq) * amp * 0.65
          + Math.sin(t * 0.85 * freq + 1.2) * amp * 0.45
          + w.x * t * 9
    let y = Math.cos(t * 1.4 * freq) * amp * 0.65
          + Math.cos(t * 1.05 * freq + 0.7) * amp * 0.4
          + w.y * t * 9

    // Clamp to target circle
    const dist = Math.sqrt(x * x + y * y)
    if (dist > RADIUS) { x = x / dist * RADIUS; y = y / dist * RADIUS }

    posRef.current = { x, y }
    if (crosshairRef.current) {
      crosshairRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
    }
    rafRef.current = requestAnimationFrame(animate)
  }, [])

  // ── Start one shot ─────────────────────────────────────────
  const startAiming = useCallback(() => {
    tRef.current = Math.random() * 80 // random phase so crosshair doesn't always start same spot
    phaseRef.current = 'aiming'
    setPhase('aiming')
    rafRef.current = requestAnimationFrame(animate)
  }, [animate])

  useEffect(() => {
    const t = setTimeout(startAiming, 400)
    return () => clearTimeout(t)
  }, [startAiming])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // ── Shoot ──────────────────────────────────────────────────
  const shoot = useCallback(() => {
    if (phaseRef.current !== 'aiming') return
    cancelAnimationFrame(rafRef.current)
    phaseRef.current = 'shot'
    setPhase('shot')

    const { x, y } = posRef.current
    const pts       = getPoints(x, y)
    const newTotal  = totalRef.current + pts
    const newLeft   = shotsRef.current - 1
    const newMarks  = [...marksRef.current,  { x, y, pts }]
    const newScores = [...scoresRef.current, pts]

    totalRef.current   = newTotal
    shotsRef.current   = newLeft
    marksRef.current   = newMarks
    scoresRef.current  = newScores

    setTotal(newTotal); setShotsLeft(newLeft)
    setMarks(newMarks); setScores(newScores); setLastPts(pts)

    setTimeout(() => {
      setLastPts(null)
      if (newLeft <= 0) {
        phaseRef.current = 'result'
        setPhase('result')
        updateScore('archery', newTotal)
        if (onFinish) onFinish(newTotal)
      } else {
        const nw = randomWind()
        setWind(nw); windRef.current = nw
        startAiming()
      }
    }, 1100)
  }, [startAiming, updateScore, onFinish])

  // Keyboard spacebar
  useEffect(() => {
    const fn = (e) => { if (e.code === 'Space') { e.preventDefault(); shoot() } }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [shoot])

  // ── Restart ────────────────────────────────────────────────
  const restart = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    totalRef.current = 0; shotsRef.current = SHOTS
    marksRef.current = []; scoresRef.current = []
    phaseRef.current = 'starting'
    setTotal(0); setShotsLeft(SHOTS); setMarks([]); setScores([])
    setLastPts(null); setWind(randomWind()); setPhase('starting')
    setTimeout(startAiming, 300)
  }, [startAiming])

  // ── Result screen ──────────────────────────────────────────
  if (phase === 'result') {
    const pct   = Math.round((total / (SHOTS * 10)) * 100)
    const grade = pct >= 90 ? '🏆 MASTER ARCHER' : pct >= 70 ? '🎯 SHARP SHOOTER' : pct >= 50 ? '⚡ MARKSMAN' : '🏹 TRAINEE'
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm">
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest text-center mb-1">ARCHERY</p>
          <p className="font-orbitron text-sm font-black text-center mb-4" style={{ color: '#ffd700' }}>{grade}</p>

          <div className="rounded-2xl p-6 text-center mb-4"
            style={{ background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.4)' }}>
            <p className="font-rajdhani text-gray-500 text-xs tracking-widest mb-1">FINAL SCORE</p>
            <motion.p initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
              className="font-orbitron text-5xl font-black" style={{ color: '#ffd700' }}>
              {total}
            </motion.p>
            <p className="font-rajdhani text-xs text-gray-600 mt-1">out of {SHOTS * 10}</p>
          </div>

          {/* Shot breakdown */}
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-orbitron text-[9px] text-gray-600 tracking-widest mb-3 text-center">SHOT BY SHOT</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {scores.map((s, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05, type: 'spring' }}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-orbitron text-xs font-black"
                  style={{
                    background: s === 10 ? 'rgba(255,215,0,0.2)' : s >= 7 ? 'rgba(204,34,0,0.2)' : s >= 4 ? 'rgba(0,10,46,0.4)' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${s === 10 ? '#ffd700' : s >= 7 ? '#cc2200' : s >= 4 ? '#555' : '#222'}`,
                    color:  s === 10 ? '#ffd700' : s >= 7 ? '#ff6644' : s >= 4 ? '#aaa' : '#444',
                  }}>
                  {s || '—'}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {!onFinish && (
              <motion.button whileTap={{ scale: 0.96 }} onClick={restart}
                className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest"
                style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.45)', color: '#ffd700' }}>
                PLAY AGAIN
              </motion.button>
            )}
            <button onClick={() => navigate('/hub')}
              className="w-full py-3 rounded-xl font-orbitron text-xs tracking-widest border border-gray-800 text-gray-600">
              ← QUIT
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Game screen ────────────────────────────────────────────
  const windDeg = wind.angle * (180 / Math.PI)

  return (
    <div className="flex flex-col items-center px-4 pt-2 select-none"
      onPointerDown={e => { if (e.target.closest('button')) return; shoot() }}
      style={{ touchAction: 'none' }}>

      {/* Header */}
      <div className="w-full flex items-center justify-between mb-3">
        <button onPointerDown={e => e.stopPropagation()} onClick={() => navigate('/hub')}
          className="font-orbitron text-[9px] tracking-widest px-3 py-1 rounded-lg"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#555' }}>← QUIT</button>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="font-orbitron text-xl font-black leading-none" style={{ color: '#ffd700' }}>{total}</p>
            <p className="font-rajdhani text-[9px] text-gray-600">SCORE</p>
          </div>
          <div className="text-center">
            <p className="font-orbitron text-xl font-black text-white leading-none">{shotsLeft}</p>
            <p className="font-rajdhani text-[9px] text-gray-600">SHOTS</p>
          </div>
        </div>
      </div>

      {/* Shot tracker */}
      <div className="flex gap-1.5 mb-3">
        {Array.from({ length: SHOTS }, (_, i) => {
          const s = scores[i]
          return (
            <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: s == null ? 'rgba(255,255,255,0.04)'
                  : s === 10 ? 'rgba(255,215,0,0.25)'
                  : s >= 7   ? 'rgba(204,34,0,0.25)'
                  : s >= 4   ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: `1px solid ${s == null ? 'rgba(255,255,255,0.08)'
                  : s === 10 ? '#ffd700'
                  : s >= 7   ? '#cc4422'
                  : s >= 4   ? '#555' : '#333'}`,
              }}>
              {s != null && (
                <span className="font-orbitron text-[8px] font-black"
                  style={{ color: s === 10 ? '#ffd700' : s >= 7 ? '#ff7755' : s >= 4 ? '#aaa' : '#555' }}>
                  {s}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Wind indicator */}
      <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl"
        style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.15)' }}>
        <p className="font-orbitron text-[9px] text-gray-600 tracking-widest">WIND</p>
        <motion.div key={wind.angle} initial={{ rotate: 0 }} animate={{ rotate: windDeg }}
          style={{ display: 'inline-block', fontSize: 13, color: '#00f5ff' }}>➤</motion.div>
        <WindDots strength={wind.strength} />
      </div>

      {/* Target */}
      <div className="relative flex items-center justify-center rounded-full"
        style={{ width: RADIUS * 2, height: RADIUS * 2 }}>

        {/* Rings — render outer → inner so inner sits on top */}
        {[...RINGS].reverse().map((ring, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width:  ring.r * RADIUS * 2,
              height: ring.r * RADIUS * 2,
              background: ring.bg,
              border: '1px solid rgba(0,0,0,0.25)',
            }} />
        ))}

        {/* Crosshair lines on target */}
        <div className="absolute pointer-events-none" style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.15)', top: '50%' }} />
        <div className="absolute pointer-events-none" style={{ height: '100%', width: 1, background: 'rgba(0,0,0,0.15)', left: '50%' }} />

        {/* Arrow marks */}
        {marks.map((m, i) => (
          <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 9, height: 9,
              background: '#00f5ff',
              border: '1.5px solid rgba(255,255,255,0.9)',
              boxShadow: '0 0 6px rgba(0,245,255,0.7)',
              left: `calc(50% + ${m.x}px - 4.5px)`,
              top:  `calc(50% + ${m.y}px - 4.5px)`,
            }} />
        ))}

        {/* Moving crosshair */}
        <div ref={crosshairRef} className="absolute pointer-events-none"
          style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: phase === 'shot' ? 0 : 1,
            transition: 'opacity 0.08s',
          }}>
          <div style={{ position: 'absolute', width: 30, height: 2, background: '#ff2222', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', boxShadow: '0 0 5px #ff2222', borderRadius: 1 }} />
          <div style={{ position: 'absolute', height: 30, width: 2, background: '#ff2222', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', boxShadow: '0 0 5px #ff2222', borderRadius: 1 }} />
          <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', border: '2px solid #ff2222', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', boxShadow: '0 0 8px rgba(255,34,34,0.5)' }} />
        </div>

        {/* Score flash */}
        <AnimatePresence>
          {lastPts !== null && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: 0 }}
              animate={{ scale: 1.6, opacity: 1,  y: -24 }}
              exit={{   scale: 1.0, opacity: 0,  y: -48 }}
              transition={{ duration: 0.25 }}
              className="absolute font-orbitron text-2xl font-black pointer-events-none z-20"
              style={{
                color: lastPts === 10 ? '#ffd700' : lastPts >= 7 ? '#ff7755' : lastPts >= 4 ? '#00f5ff' : '#666',
                textShadow: '0 0 20px currentColor',
                left: '50%', top: '40%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
              }}>
              {lastPts === 10 ? '🎯 BULLSEYE' : lastPts === 0 ? 'MISS' : `+${lastPts}`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tap hint */}
      <motion.p className="font-orbitron text-[10px] tracking-widest mt-5"
        style={{ color: '#444' }}
        animate={{ opacity: phase === 'aiming' ? [0.4, 1, 0.4] : 0 }}
        transition={{ duration: 1.4, repeat: Infinity }}>
        TAP TO SHOOT
      </motion.p>
    </div>
  )
}
