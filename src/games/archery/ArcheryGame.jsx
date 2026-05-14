import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'

// ── Constants ─────────────────────────────────────────────────────────────────
const SHOTS    = 10
const TRAD     = 130  // target display radius (px)
const MAX_PULL = 72   // max drag distance in pull zone (px)

const RINGS = [
  { r: 0.09, pts: 10, fill: '#ffd700', stroke: '#c8960c' },
  { r: 0.20, pts:  9, fill: '#f0c800', stroke: '#c8a000' },
  { r: 0.32, pts:  8, fill: '#dd2020', stroke: '#aa0000' },
  { r: 0.44, pts:  7, fill: '#ee5555', stroke: '#cc2222' },
  { r: 0.56, pts:  6, fill: '#1133cc', stroke: '#0022aa' },
  { r: 0.68, pts:  5, fill: '#3355ee', stroke: '#1133cc' },
  { r: 0.80, pts:  4, fill: '#0e0e0e', stroke: '#333'    },
  { r: 0.90, pts:  3, fill: '#2a2a2a', stroke: '#444'    },
  { r: 1.00, pts:  2, fill: '#888',    stroke: '#666'    },
]

function scoreAt(nx, ny) {
  const d = Math.sqrt(nx * nx + ny * ny)
  if (d > 1) return 0
  for (const r of RINGS) if (d <= r.r) return r.pts
  return 0
}

const GRADES = [
  { min: 90, label: 'MASTER ARCHER', color: '#ffd700' },
  { min: 70, label: 'SHARP SHOOTER', color: '#00f5ff' },
  { min: 50, label: 'MARKSMAN',      color: '#00ff88' },
  { min:  0, label: 'TRAINEE',       color: '#888'    },
]
const getGrade = (s) => GRADES.find(g => s >= g.min) || GRADES[GRADES.length - 1]

// ── Component ─────────────────────────────────────────────────────────────────
export default function ArcheryGame({ onFinish }) {
  const { updateScore } = useUser()

  const [screen,  setScreen]  = useState('game')  // 'game' | 'results'
  const [shotN,   setShotN]   = useState(0)
  const [total,   setTotal]   = useState(0)
  const [arrows,  setArrows]  = useState([])      // [{nx,ny,pts}]
  const [flash,   setFlash]   = useState(null)
  const [phase,   setPhase]   = useState('idle')  // idle | aiming | shot
  const [pullPct, setPullPct] = useState(0)

  // Refs to avoid stale closures in RAF/event handlers
  const aimRef      = useRef({ x: 0, y: 0 })
  const wobRef      = useRef({ x: 0, y: 0 })
  const pullStrRef  = useRef(0)
  const totalRef    = useRef(0)
  const shotNRef    = useRef(0)
  const phaseRef    = useRef('idle')
  const dragRef     = useRef(null)
  const startTRef   = useRef(0)
  const rafRef      = useRef(null)
  const crossRef    = useRef(null)
  const pullDotRef  = useRef(null)
  const pullZoneRef = useRef(null)

  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── Wobble RAF loop ────────────────────────────────────────────────────────
  const startWobble = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const loop = (ts) => {
      const holdSec = (Date.now() - startTRef.current) / 1000
      const amp = Math.min(0.05 + holdSec * 0.022, 0.22)
      const wx = Math.sin(ts * 0.0053) * amp * 0.7 + Math.sin(ts * 0.0028 + 1.1) * amp * 0.4
      const wy = Math.cos(ts * 0.0041) * amp * 0.8 + Math.cos(ts * 0.0069 + 0.6) * amp * 0.35
      wobRef.current = { x: wx, y: wy }
      if (crossRef.current) {
        const cx = (aimRef.current.x + wx) * TRAD
        const cy = (aimRef.current.y + wy) * TRAD
        crossRef.current.style.transform =
          `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`
        crossRef.current.style.opacity = '1'
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const stopWobble = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (crossRef.current) crossRef.current.style.opacity = '0'
  }, [])

  // ── Pointer handlers ───────────────────────────────────────────────────────
  const onDown = useCallback((e) => {
    if (phaseRef.current !== 'idle') return
    e.preventDefault()
    const pt = e.touches?.[0] || e
    dragRef.current    = { x: pt.clientX, y: pt.clientY }
    startTRef.current  = Date.now()
    aimRef.current     = { x: 0, y: 0 }
    pullStrRef.current = 0
    setPullPct(0)
    setPhase('aiming')
    startWobble()
  }, [startWobble])

  const onMove = useCallback((e) => {
    if (phaseRef.current !== 'aiming' || !dragRef.current) return
    e.preventDefault()
    const pt   = e.touches?.[0] || e
    const dx   = pt.clientX - dragRef.current.x
    const dy   = pt.clientY - dragRef.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const str  = Math.min(dist / MAX_PULL, 1)

    aimRef.current = {
      x: Math.max(-1, Math.min(1, dx / MAX_PULL)),
      y: Math.max(-1, Math.min(1, dy / MAX_PULL)),
    }
    pullStrRef.current = str
    setPullPct(str)

    if (pullDotRef.current) {
      const clamped = Math.min(dist, MAX_PULL)
      const cdx = (dx / (dist || 1)) * clamped
      const cdy = (dy / (dist || 1)) * clamped
      pullDotRef.current.style.transform =
        `translate(calc(-50% + ${cdx}px), calc(-50% + ${cdy}px))`
    }
  }, [])

  const onUp = useCallback((e) => {
    if (phaseRef.current !== 'aiming' || !dragRef.current) return
    e.preventDefault()
    dragRef.current = null
    stopWobble()

    const aim = { ...aimRef.current }
    const wob = { ...wobRef.current }
    const str = pullStrRef.current

    setPullPct(0)
    if (pullDotRef.current)
      pullDotRef.current.style.transform = 'translate(-50%, -50%)'

    setPhase('shot')

    setTimeout(() => {
      // Spread: weak pull = big spread, full pull = precise
      const spread = (1 - str) * 0.32 + 0.02
      const nx = Math.max(-1.15, Math.min(1.15,
        aim.x + wob.x + (Math.random() - 0.5) * 2 * spread))
      const ny = Math.max(-1.15, Math.min(1.15,
        aim.y + wob.y + (Math.random() - 0.5) * 2 * spread))
      const pts = scoreAt(nx, ny)

      totalRef.current += pts
      shotNRef.current += 1
      const newTotal = totalRef.current
      const newShot  = shotNRef.current

      setTotal(newTotal)
      setShotN(newShot)
      setArrows(a => [...a, { nx, ny, pts }])
      setFlash({ pts })

      setTimeout(() => {
        setFlash(null)
        if (newShot >= SHOTS) {
          updateScore?.('archery', newTotal)
          onFinish?.(newTotal)
          setScreen('results')
        } else {
          setPhase('idle')
        }
      }, 1100)
    }, 300)
  }, [stopWobble, updateScore, onFinish])

  // Attach pointer events to pull zone element
  useEffect(() => {
    const el = pullZoneRef.current
    if (!el) return
    el.addEventListener('touchstart',    onDown, { passive: false })
    el.addEventListener('touchmove',     onMove, { passive: false })
    el.addEventListener('touchend',      onUp,   { passive: false })
    el.addEventListener('mousedown',     onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      el.removeEventListener('touchstart',    onDown)
      el.removeEventListener('touchmove',     onMove)
      el.removeEventListener('touchend',      onUp)
      el.removeEventListener('mousedown',     onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [onDown, onMove, onUp])

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    totalRef.current   = 0
    shotNRef.current   = 0
    aimRef.current     = { x: 0, y: 0 }
    pullStrRef.current = 0
    setScreen('game'); setTotal(0); setShotN(0)
    setArrows([]); setFlash(null); setPhase('idle'); setPullPct(0)
  }

  // ── Results screen ────────────────────────────────────────────────────────
  if (screen === 'results') {
    const grade = getGrade(total)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-24">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-3xl p-6 text-center"
          style={{ background: 'rgba(10,10,28,0.97)', border: '1px solid rgba(255,215,0,0.3)' }}>

          <div className="text-5xl mb-2">🏹</div>
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-1">FINAL SCORE</p>
          <p className="font-orbitron text-5xl font-black mb-1" style={{ color: '#ffd700' }}>{total}</p>
          <p className="font-orbitron text-sm font-bold mb-5" style={{ color: grade.color }}>{grade.label}</p>

          {/* Mini target showing all shots */}
          <div className="relative w-36 h-36 mx-auto mb-5">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {[...RINGS].reverse().map((r, i) => (
                <circle key={i} cx="50" cy="50" r={r.r * 46}
                  fill={r.fill} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              ))}
              <line x1="50" y1="43" x2="50" y2="57" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
              <line x1="43" y1="50" x2="57" y2="50" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
              {arrows.map((a, i) => (
                <g key={i}>
                  <circle cx={50 + a.nx * 46} cy={50 + a.ny * 46} r="2.8"
                    fill="rgba(0,0,0,0.7)" stroke="white" strokeWidth="1" />
                  <line
                    x1={50 + a.nx * 46} y1={50 + a.ny * 46 - 9}
                    x2={50 + a.nx * 46} y2={50 + a.ny * 46 - 3}
                    stroke="rgba(200,160,80,0.85)" strokeWidth="1.2" strokeLinecap="round" />
                </g>
              ))}
            </svg>
          </div>

          {/* Shot breakdown */}
          <div className="grid grid-cols-5 gap-1.5 mb-5">
            {arrows.map((a, i) => (
              <div key={i} className="rounded-xl py-2 text-center"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${a.pts === 10 ? 'rgba(255,215,0,0.4)'
                    : a.pts >= 7 ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <p className="font-rajdhani text-[9px] text-gray-600">#{i + 1}</p>
                <p className="font-orbitron text-sm font-black"
                  style={{ color: a.pts === 10 ? '#ffd700' : a.pts >= 7 ? '#00ff88' : a.pts >= 4 ? '#00f5ff' : '#555' }}>
                  {a.pts}
                </p>
              </div>
            ))}
          </div>

          <button onClick={reset}
            className="w-full py-3 rounded-2xl font-orbitron text-xs tracking-widest"
            style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.35)', color: '#ffd700' }}>
            🔄 PLAY AGAIN
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Game screen ───────────────────────────────────────────────────────────
  const tDiam = TRAD * 2

  return (
    <div className="flex flex-col items-center min-h-screen pb-4 select-none" style={{ userSelect: 'none' }}>

      {/* Header */}
      <div className="w-full px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="text-center">
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">SHOT</p>
          <p className="font-orbitron text-2xl font-black text-white">
            {shotN}<span className="text-base text-gray-600">/{SHOTS}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">SCORE</p>
          <p className="font-orbitron text-3xl font-black" style={{ color: '#ffd700' }}>{total}</p>
        </div>
        <div className="text-center">
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">BEST</p>
          <p className="font-orbitron text-2xl font-black" style={{ color: '#00f5ff' }}>
            {arrows.length ? Math.max(...arrows.map(a => a.pts)) : '—'}
          </p>
        </div>
      </div>

      {/* Target */}
      <div className="relative flex-shrink-0 flex items-center justify-center mt-1"
        style={{ width: tDiam + 16, height: tDiam + 16 }}>

        <svg width={tDiam} height={tDiam} viewBox={`0 0 ${tDiam} ${tDiam}`}>
          {[...RINGS].reverse().map((r, i) => (
            <circle key={i} cx={TRAD} cy={TRAD} r={r.r * TRAD}
              fill={r.fill} stroke={r.stroke} strokeWidth="1" />
          ))}
          {/* Centre cross hairs */}
          <line x1={TRAD} y1={TRAD - 18} x2={TRAD} y2={TRAD + 18}
            stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1={TRAD - 18} y1={TRAD} x2={TRAD + 18} y2={TRAD}
            stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          {/* Arrow markers */}
          {arrows.map((a, i) => {
            const ax = TRAD + a.nx * TRAD
            const ay = TRAD + a.ny * TRAD
            return (
              <g key={i}>
                {/* Shaft */}
                <line x1={ax} y1={ay - 14} x2={ax} y2={ay - 5}
                  stroke="rgba(210,165,70,0.9)" strokeWidth="2" strokeLinecap="round" />
                {/* Head */}
                <circle cx={ax} cy={ay} r="5.5"
                  fill="rgba(0,0,0,0.65)" stroke="white" strokeWidth="1.5" />
                <text x={ax} y={ay + 0.5} textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
                  {a.pts}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Crosshair — RAF-updated directly on the DOM node */}
        <div ref={crossRef} className="absolute pointer-events-none"
          style={{ top: '50%', left: '50%', opacity: 0 }}>
          <svg width="36" height="36" viewBox="0 0 36 36"
            style={{ transform: 'translate(-50%, -50%)' }}>
            <circle cx="18" cy="18" r="9" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="18" y1="2"  x2="18" y2="10" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="18" y1="26" x2="18" y2="34" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="2"  y1="18" x2="10" y2="18" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="26" y1="18" x2="34" y2="18" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="2" fill="rgba(255,60,60,0.95)" />
          </svg>
        </div>

        {/* Score flash */}
        <AnimatePresence>
          {flash && (
            <motion.div key="flash"
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.15, y: -24 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-5 py-2.5 rounded-2xl"
                style={{
                  background: flash.pts === 10 ? 'rgba(255,215,0,0.18)'
                    : flash.pts === 0 ? 'rgba(255,40,40,0.15)' : 'rgba(0,0,0,0.6)',
                  border: `1px solid ${flash.pts === 10 ? 'rgba(255,215,0,0.6)'
                    : flash.pts === 0 ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.2)'}`,
                  backdropFilter: 'blur(8px)',
                }}>
                <p className="font-orbitron text-2xl font-black"
                  style={{ color: flash.pts === 10 ? '#ffd700' : flash.pts === 0 ? '#ff5555' : '#fff' }}>
                  {flash.pts === 10 ? '🎯 BULLSEYE!' : flash.pts === 0 ? 'MISS' : `+${flash.pts}`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pull Zone */}
      <div className="flex-1 w-full flex flex-col items-center justify-center px-6 pt-1 pb-2">

        <p className="font-orbitron text-[10px] tracking-widest mb-4 h-4"
          style={{ color: phase === 'aiming' ? '#ffd700' : '#444' }}>
          {phase === 'idle' ? 'DRAG TO AIM  ·  RELEASE TO SHOOT'
            : phase === 'aiming' ? '— HOLD STEADY —' : ''}
        </p>

        {/* Joystick pull area */}
        <div ref={pullZoneRef}
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 188, height: 188,
            background: phase === 'aiming'
              ? 'radial-gradient(circle, rgba(255,215,0,0.07) 0%, transparent 70%)'
              : 'rgba(255,255,255,0.02)',
            border: `2px solid ${phase === 'aiming' ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
            touchAction: 'none',
            cursor: phase === 'idle' ? 'pointer' : 'default',
            transition: 'border-color 0.2s, background 0.2s',
          }}>

          {/* Pull-strength arc */}
          <svg className="absolute inset-0 pointer-events-none" width="188" height="188">
            <circle cx="94" cy="94" r="86"
              fill="none" stroke="rgba(255,215,0,0.07)" strokeWidth="4" />
            {pullPct > 0 && (
              <circle cx="94" cy="94" r="86"
                fill="none" stroke="#ffd700" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 86 * pullPct} ${2 * Math.PI * 86}`}
                strokeDashoffset={2 * Math.PI * 86 * 0.25} />
            )}
          </svg>

          {/* Static bow */}
          <svg width="42" height="88" viewBox="0 0 42 88"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <path d="M21 4 Q 2 22 2 44 Q 2 66 21 84"
              fill="none"
              stroke={phase === 'aiming' ? '#c8a040' : '#5a4525'}
              strokeWidth="5" strokeLinecap="round"
              style={{ transition: 'stroke 0.2s' }} />
            {phase === 'aiming' ? (
              <>
                <line x1="21" y1="4"  x2="29" y2="44" stroke="#bbb" strokeWidth="1.5" />
                <line x1="21" y1="84" x2="29" y2="44" stroke="#bbb" strokeWidth="1.5" />
                <line x1="29" y1="44" x2="42" y2="44"
                  stroke="rgba(200,160,70,0.85)" strokeWidth="2" strokeLinecap="round" />
              </>
            ) : (
              <line x1="21" y1="4" x2="21" y2="84" stroke="#888" strokeWidth="1.5" />
            )}
          </svg>

          {/* Draggable handle */}
          <div ref={pullDotRef}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 54, height: 54,
              borderRadius: '50%',
              background: phase === 'aiming'
                ? 'radial-gradient(circle, rgba(255,215,0,0.28), rgba(255,215,0,0.06))'
                : 'rgba(255,255,255,0.05)',
              border: `2px solid ${phase === 'aiming' ? 'rgba(255,215,0,0.75)' : 'rgba(255,255,255,0.15)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, pointerEvents: 'none',
              boxShadow: phase === 'aiming' ? '0 0 20px rgba(255,215,0,0.3)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}>
            🏹
          </div>
        </div>

        {/* Pull-strength pips */}
        <div className="flex gap-1.5 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-7 h-1.5 rounded-full"
              style={{
                background: pullPct > i * 0.2
                  ? `hsl(${50 - i * 8}, 90%, 55%)`
                  : 'rgba(255,255,255,0.1)',
                transition: 'background 0.1s',
              }} />
          ))}
        </div>
      </div>
    </div>
  )
}
