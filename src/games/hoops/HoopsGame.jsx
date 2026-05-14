import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const W = 390
const H = 520       // canvas height — power bar sits below in HTML

const GRAVITY     = 0.52
const LAUNCH_X    = W / 2
const LAUNCH_Y    = H - 60      // ball resting position
const HOOP_Y      = 155         // rim height on canvas
const HOOP_TRAVEL = 120         // how far the hoop swings from center

// VY needed so ball peaks exactly at HOOP_Y when power = 50%
// peak: LAUNCH_Y - vy² / (2*GRAVITY) = HOOP_Y  →  vy = sqrt(2*G*(LAUNCH_Y-HOOP_Y))
const VY_OPTIMAL  = Math.sqrt(2 * GRAVITY * (LAUNCH_Y - HOOP_Y))   // ≈ 17.1

const GAME_DURATION = 60

const DIFF = {
  easy:   { rimHalfWidth: 42, hoopSpeed: 1.2, fillTime: 2.4, sweetMin: 32, sweetMax: 68, label: 'ROOKIE'     },
  medium: { rimHalfWidth: 32, hoopSpeed: 2.0, fillTime: 1.7, sweetMin: 38, sweetMax: 62, label: 'CHALLENGER' },
  hard:   { rimHalfWidth: 23, hoopSpeed: 3.0, fillTime: 1.2, sweetMin: 43, sweetMax: 57, label: 'VETERAN'    },
}

function powerToVy(power) {
  // power 0-100 → vy (negative = upward)
  // at 50%: peaks at HOOP_Y; at 100%: massive overshoot; at 0%: no height
  return -(power / 50) * VY_OPTIMAL
}

function initState(cfg) {
  return {
    ball:       { x: LAUNCH_X, y: LAUNCH_Y, vy: 0, flying: false, scored: false },
    hoop:       { cx: W / 2, phase: 0 },
    score:      0,
    made:       0,
    attempted:  0,
    streak:     0,
    timeLeft:   GAME_DURATION,
    pointsFlash: 0,
    lastPoints:  0,
    missFlash:   0,
  }
}

/* ── Draw helpers ───────────────────────────────────────────────────────────── */

function drawCourt(ctx) {
  // Floor
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke()
  // Three-point arc
  ctx.beginPath(); ctx.arc(W / 2, H - 30, 200, Math.PI, 0); ctx.stroke()
  // Lane
  ctx.strokeRect(118, H - 30, 154, -100)
  // Free throw circle
  ctx.beginPath(); ctx.arc(W / 2, H - 130, 48, Math.PI, 0); ctx.stroke()
}

function drawHoop(ctx, cx, rimHW) {
  // Backboard
  const bx = cx + rimHW - 2
  ctx.fillStyle = 'rgba(255,255,255,0.10)'
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.5
  ctx.fillRect(bx, HOOP_Y - 38, 46, 40)
  ctx.strokeRect(bx, HOOP_Y - 38, 46, 40)
  ctx.strokeStyle = 'rgba(255,255,255,0.38)'
  ctx.strokeRect(bx + 8, HOOP_Y - 26, 30, 24)

  // Support arm
  ctx.beginPath()
  ctx.moveTo(bx, HOOP_Y + 1); ctx.lineTo(cx + rimHW, HOOP_Y + 1)
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke()

  // Rim with glow
  ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12
  ctx.beginPath(); ctx.moveTo(cx - rimHW, HOOP_Y); ctx.lineTo(cx + rimHW, HOOP_Y)
  ctx.strokeStyle = '#ff6b00'; ctx.lineWidth = 4; ctx.stroke()
  ctx.shadowBlur = 0

  // Net zigzag
  const steps = 8
  const sw = (rimHW * 2) / steps
  const nh = 28
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const nx = cx - rimHW + i * sw
    const ny = HOOP_Y + (i % 2 === 0 ? 2 : nh * 0.62)
    i === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny)
  }
  for (let i = steps; i >= 0; i--) {
    ctx.lineTo(cx - rimHW + i * sw, HOOP_Y + nh * 0.55 + (i % 2 === 0 ? nh * 0.45 : 0))
  }
  ctx.strokeStyle = 'rgba(180,180,180,0.38)'; ctx.lineWidth = 1; ctx.stroke()
}

function drawBall(ctx, x, y) {
  const r = 17
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = '#e8740a'
  ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 18
  ctx.fill(); ctx.shadowBlur = 0
  // Seams
  ctx.strokeStyle = 'rgba(0,0,0,0.42)'; ctx.lineWidth = 1.8
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI/2, Math.PI/2); ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y - 8, 14, 0, Math.PI); ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y + 8, 14, Math.PI, 0); ctx.stroke()
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function HoopsGame({ difficulty = 'medium' }) {
  const navigate = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef   = useRef(null)
  const stRef       = useRef(initState(cfg))
  const rafRef      = useRef(null)
  const lastTimeRef = useRef(null)

  // Power charging state (read by RAF loop, written by pointer events)
  const chargingRef  = useRef(false)
  const powerRef     = useRef(0)   // 0-100

  // React state — only for re-rendering the power bar and phase
  const [power,    setPower]    = useState(0)
  const [charging, setCharging] = useState(false)
  const [phase,    setPhase]    = useState('playing')
  const [finals,   setFinals]   = useState({ score: 0, made: 0, att: 0 })

  const resetGame = useCallback(() => {
    stRef.current   = initState(cfg)
    lastTimeRef.current = null
    chargingRef.current = false
    powerRef.current    = 0
    setPower(0)
    setCharging(false)
    setPhase('playing')
  }, [cfg])

  // Start charge
  const handleDown = useCallback((e) => {
    e.preventDefault()
    if (stRef.current.ball.flying) return
    chargingRef.current = true
    powerRef.current    = 0
    setPower(0)
    setCharging(true)
  }, [])

  // Release — fire the ball
  const handleUp = useCallback((e) => {
    e?.preventDefault()
    if (!chargingRef.current) return
    chargingRef.current = false
    setCharging(false)

    const st = stRef.current
    if (st.ball.flying) return

    const p  = powerRef.current
    const vy = powerToVy(p)
    st.ball  = { x: LAUNCH_X, y: LAUNCH_Y, vy, flying: true, scored: false }
    st.attempted += 1
    // Store power for scoring check
    st._launchPower = p
  }, [])

  /* ── Main RAF loop ── */
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function tick(timestamp) {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const dt = Math.min((timestamp - lastTimeRef.current) / 16.67, 3)
      lastTimeRef.current = timestamp

      const st = stRef.current

      /* ── Charge power ── */
      if (chargingRef.current && !st.ball.flying) {
        const increment = (100 / (cfg.fillTime * 60)) * dt
        const next = Math.min(100, powerRef.current + increment)
        powerRef.current = next
        setPower(next)
      }

      /* ── Move hoop ── */
      st.hoop.phase += cfg.hoopSpeed * 0.018 * dt
      st.hoop.cx     = W / 2 + Math.sin(st.hoop.phase) * HOOP_TRAVEL

      /* ── Ball physics ── */
      if (st.ball.flying) {
        st.ball.vy += GRAVITY * dt
        st.ball.y  += st.ball.vy * dt
        // vx = 0, ball goes straight up from center

        // Score detection: ball crosses HOOP_Y going upward
        if (!st.ball.scored && st.ball.vy < 0 &&
            st.ball.y <= HOOP_Y + 5 && st.ball.y >= HOOP_Y - 22) {
          const pwr      = st._launchPower ?? 0
          const inSweet  = pwr >= cfg.sweetMin && pwr <= cfg.sweetMax
          const dist     = Math.abs(LAUNCH_X - st.hoop.cx)
          const aligned  = dist <= cfg.rimHalfWidth

          if (inSweet && aligned) {
            const isSwish  = dist < cfg.rimHalfWidth * 0.4 && Math.abs(pwr - 50) < 6
            const pts      = isSwish ? 3 : 2
            st.score      += pts
            st.made       += 1
            st.streak     += 1
            st.lastPoints  = pts
            st.pointsFlash = 55
            st.ball.scored = true
          } else if (!aligned || !inSweet) {
            st.streak    = 0
            st.missFlash = 30
            st.ball.scored = false // will still fly off
          }
        }

        // Reset ball after it leaves canvas
        if (st.ball.y > H + 50) {
          st.ball = { x: LAUNCH_X, y: LAUNCH_Y, vy: 0, flying: false, scored: false }
          powerRef.current = 0
          setPower(0)
        }
      }

      /* ── Timer ── */
      st.timeLeft -= dt / 60
      if (st.timeLeft <= 0) {
        recordGame?.({ game: 'hoops', score: st.score, mode: 'solo', won: st.score > 0 })
        setFinals({ score: st.score, made: st.made, att: st.attempted })
        setPhase('done')
        return
      }

      /* ── Flash decay ── */
      if (st.pointsFlash > 0) st.pointsFlash -= dt
      if (st.missFlash   > 0) st.missFlash   -= dt

      /* ── Draw ── */
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#080818'; ctx.fillRect(0, 0, W, H)
      drawCourt(ctx)
      drawHoop(ctx, st.hoop.cx, cfg.rimHalfWidth)

      // Alignment guide — subtle vertical line showing ball's path
      if (!st.ball.flying) {
        ctx.setLineDash([4, 10])
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(LAUNCH_X, LAUNCH_Y - 22); ctx.lineTo(LAUNCH_X, HOOP_Y); ctx.stroke()
        ctx.setLineDash([])
        // Pulse ring on rim when hoop is aligned
        const d = Math.abs(LAUNCH_X - st.hoop.cx)
        if (d <= cfg.rimHalfWidth) {
          const intensity = 1 - d / cfg.rimHalfWidth
          ctx.beginPath(); ctx.arc(LAUNCH_X, HOOP_Y, 12, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0,255,136,${0.18 + intensity * 0.35})`; ctx.fill()
        }
      }

      drawBall(ctx, st.ball.x, st.ball.y)

      // Points / miss flash
      if (st.pointsFlash > 0) {
        const a   = Math.min(1, st.pointsFlash / 30)
        const rise = (55 - st.pointsFlash) * 1.1
        ctx.fillStyle = `rgba(255,215,0,${a})`
        ctx.font = `bold ${26 + (55 - st.pointsFlash) * 0.35}px monospace`
        ctx.textAlign = 'center'
        ctx.fillText(`+${st.lastPoints}`, LAUNCH_X, HOOP_Y - 28 - rise)
      }
      if (st.missFlash > 0) {
        const a = st.missFlash / 30
        ctx.fillStyle = `rgba(255,0,110,${a})`
        ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'
        ctx.fillText('MISS', LAUNCH_X, HOOP_Y - 22)
      }

      // HUD
      ctx.shadowBlur = 0
      ctx.fillStyle  = '#ffd700'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left'
      ctx.fillText(`${st.score} PTS`, 14, 26)

      if (st.streak >= 3) {
        ctx.fillStyle = '#ff006e'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right'
        ctx.fillText(`${st.streak} STREAK`, W - 14, 26)
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '10px monospace'; ctx.textAlign = 'right'
        ctx.fillText(`${st.made}/${st.attempted}`, W - 14, 26)
      }

      // Timer bar
      const ratio = Math.max(0, st.timeLeft / GAME_DURATION)
      const barClr = ratio > 0.4 ? '#ffd700' : ratio > 0.2 ? '#ff8c00' : '#ff006e'
      ctx.fillStyle = 'rgba(255,215,0,0.10)'; ctx.fillRect(0, H - 4, W, 4)
      ctx.fillStyle = barClr; ctx.fillRect(0, H - 4, W * ratio, 4)

      // Timer text
      ctx.fillStyle = ratio < 0.2 ? '#ff006e' : 'rgba(255,255,255,0.22)'
      ctx.font = '10px monospace'; ctx.textAlign = 'center'
      ctx.fillText(`${Math.ceil(st.timeLeft)}s`, W / 2, 26)

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, cfg, recordGame])

  if (phase === 'done') {
    const acc = finals.att > 0 ? Math.round(finals.made / finals.att * 100) + '%' : '0%'
    return (
      <ResultScreen
        game="HOOP SHOTS"
        score={finals.score}
        color="gold"
        stats={[
          { label: 'MADE',  value: finals.made },
          { label: 'SHOTS', value: finals.att  },
          { label: 'ACC',   value: acc          },
        ]}
        onPlayAgain={resetGame}
        onHub={() => navigate('/hub')}
      />
    )
  }

  /* ── Power bar colors ── */
  const pct       = power
  const inSweet   = pct >= cfg.sweetMin && pct <= cfg.sweetMax
  const barColor  = pct < cfg.sweetMin - 8
    ? '#ff006e'
    : inSweet
      ? '#00ff88'
      : pct > cfg.sweetMax + 8
        ? '#ff006e'
        : '#ffd700'

  return (
    <div className="flex flex-col items-center" style={{ background: '#080818', minHeight: '100vh' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', maxWidth: '100%', touchAction: 'none' }}
      />

      {/* Power meter + button */}
      <div style={{ width: '100%', maxWidth: W, padding: '16px 20px 28px', boxSizing: 'border-box' }}>

        {/* Zone labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ff006e', letterSpacing: '0.1em' }}>WEAK</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#00ff88', letterSpacing: '0.1em' }}>
            {inSweet && charging ? '● PERFECT' : 'SWEET ZONE'}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ff006e', letterSpacing: '0.1em' }}>OVER</span>
        </div>

        {/* Power bar track */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 14,
          borderRadius: 7,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          marginBottom: 14,
          overflow: 'hidden',
        }}>
          {/* Sweet zone background highlight */}
          <div style={{
            position: 'absolute',
            left: `${cfg.sweetMin}%`,
            width: `${cfg.sweetMax - cfg.sweetMin}%`,
            top: 0, bottom: 0,
            background: 'rgba(0,255,136,0.12)',
          }} />

          {/* Fill */}
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: `${pct}%`,
            borderRadius: 7,
            background: barColor,
            boxShadow: charging ? `0 0 10px ${barColor}` : 'none',
            transition: charging ? 'none' : 'background 0.2s, width 0.05s',
          }} />

          {/* Sweet zone borders (tick marks) */}
          {[cfg.sweetMin, cfg.sweetMax].map(p => (
            <div key={p} style={{
              position: 'absolute',
              left: `${p}%`,
              top: 0, bottom: 0,
              width: 2,
              background: 'rgba(0,255,136,0.6)',
              transform: 'translateX(-50%)',
            }} />
          ))}
        </div>

        {/* Shoot button */}
        <button
          onPointerDown={handleDown}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          style={{
            width: '100%',
            height: 60,
            borderRadius: 16,
            background: charging
              ? (inSweet ? 'rgba(0,255,136,0.15)' : 'rgba(255,140,0,0.12)')
              : 'rgba(255,140,0,0.08)',
            border: charging
              ? `2px solid ${inSweet ? '#00ff88' : '#ff8c00'}`
              : '2px solid rgba(255,140,0,0.45)',
            color: charging ? (inSweet ? '#00ff88' : '#ff8c00') : '#ff8c00',
            fontFamily: 'monospace',
            fontSize: 16,
            fontWeight: 'bold',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            boxShadow: charging && inSweet ? '0 0 24px rgba(0,255,136,0.25)' : 'none',
            transition: 'background 0.1s, border-color 0.1s, color 0.1s, box-shadow 0.1s',
          }}
        >
          {charging ? (inSweet ? '● RELEASE!' : 'HOLD...') : 'HOLD TO SHOOT'}
        </button>

        <p style={{
          fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)',
          textAlign: 'center', letterSpacing: '0.12em', marginTop: 10,
        }}>
          TIME YOUR RELEASE + THE HOOP
        </p>
      </div>
    </div>
  )
}
