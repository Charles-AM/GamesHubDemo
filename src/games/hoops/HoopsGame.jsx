import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

/* ─── Canvas ─────────────────────────────────────────────────────────── */
const W = 390
const H = 580

const GRAVITY     = 0.45          // px / frame²
const SWIPE_FACTOR = 0.21         // maps swipe px → velocity
const MAX_SPEED   = 22            // cap so wild swipes don't teleport

/* Ball start */
const LAUNCH_X = 195
const LAUNCH_Y = 490

/* Hoop */
const HOOP_Y      = 175           // rim Y
const HOOP_CENTER = W / 2         // hoop oscillates around this
const HOOP_TRAVEL = 100           // ±px from center
const RIM_HALF    = 28            // half-rim width (ball must thread this)
const NET_DEPTH   = 38            // how long the net hangs below rim

const GAME_DURATION = 60

const DIFF = {
  easy:   { rimHalf: 36, hoopSpeed: 1.0, label: 'ROOKIE'     },
  medium: { rimHalf: 28, hoopSpeed: 1.8, label: 'CHALLENGER' },
  hard:   { rimHalf: 20, hoopSpeed: 2.8, label: 'VETERAN'    },
}

/* ─── Draw helpers ───────────────────────────────────────────────────── */

function drawCourt(ctx) {
  // Hardwood floor gradient
  const floor = ctx.createLinearGradient(0, H - 90, 0, H)
  floor.addColorStop(0, '#3d1f00')
  floor.addColorStop(1, '#2a1500')
  ctx.fillStyle = floor; ctx.fillRect(0, H - 90, W, 90)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5
  ctx.strokeRect(60, H - 90, W - 120, 84)
  ctx.beginPath(); ctx.arc(W / 2, H - 90, 50, Math.PI, 0); ctx.stroke()

  // Backboard support pole (top-right)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(320, 30); ctx.lineTo(320, HOOP_Y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(320, HOOP_Y); ctx.lineTo(W / 2 + DIFF.medium.rimHalf, HOOP_Y); ctx.stroke()

  // Dark sky bg
  const sky = ctx.createLinearGradient(0, 0, 0, H - 90)
  sky.addColorStop(0, '#08081a')
  sky.addColorStop(1, '#0d0d22')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H - 90)
}

function drawHoop(ctx, cx, rh) {
  // Backboard (top-right area)
  const bbX = cx + rh + 2
  ctx.fillStyle = 'rgba(255,255,255,0.09)'
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5
  ctx.fillRect(bbX, HOOP_Y - 44, 48, 44)
  ctx.strokeRect(bbX, HOOP_Y - 44, 48, 44)
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.strokeRect(bbX + 8, HOOP_Y - 30, 32, 26)

  // Arm
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(bbX, HOOP_Y); ctx.lineTo(cx + rh, HOOP_Y); ctx.stroke()

  // Rim (glowing orange)
  ctx.shadowColor = '#ff6200'; ctx.shadowBlur = 14
  ctx.strokeStyle = '#ff6200'; ctx.lineWidth = 5
  ctx.beginPath(); ctx.moveTo(cx - rh, HOOP_Y); ctx.lineTo(cx + rh, HOOP_Y); ctx.stroke()
  ctx.shadowBlur = 0

  // Net — zigzag from both rim ends, converging at bottom centre
  const steps = 9
  ctx.strokeStyle = 'rgba(220,220,220,0.42)'; ctx.lineWidth = 1.2
  ctx.beginPath()
  const netW = rh * 2
  const botX = cx
  const botY = HOOP_Y + NET_DEPTH
  for (let i = 0; i <= steps; i++) {
    const t  = i / steps
    const nx = (cx - rh) + t * netW
    const ny = HOOP_Y + (i % 2 === 0 ? 4 : NET_DEPTH * 0.58)
    i === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny)
  }
  ctx.stroke()
  // Converging vertical lines to bottom point
  for (let i = 0; i <= steps; i += 2) {
    const t  = i / steps
    const nx = (cx - rh) + t * netW
    const ny = HOOP_Y + 4
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(botX, botY); ctx.stroke()
  }
}

function drawBall(ctx, x, y) {
  const r = 18
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle   = '#e8740a'
  ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 16
  ctx.fill(); ctx.shadowBlur = 0

  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.8
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI/2, Math.PI/2); ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y - 9, 15, 0, Math.PI); ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y + 9, 15, Math.PI, 0); ctx.stroke()
}

/* Simulate parabola, return point array */
function simArc(x, y, vx, vy, frames = 80) {
  const pts = []
  let px = x, py = y, pvx = vx, pvy = vy
  for (let i = 0; i < frames; i++) {
    pvy += GRAVITY; px += pvx; py += pvy
    if (py > H + 30 || px < -40 || px > W + 40) break
    pts.push({ x: px, y: py })
  }
  return pts
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function HoopsGame({ difficulty = 'medium' }) {
  const navigate = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef   = useRef(null)
  const stRef       = useRef(null)
  const rafRef      = useRef(null)
  const lastTimeRef = useRef(null)

  const dragRef = useRef({ active: false, sx: 0, sy: 0, cx: 0, cy: 0 })

  const [phase,  setPhase]  = useState('playing')
  const [finals, setFinals] = useState({ score: 0, made: 0, att: 0 })

  const mkState = useCallback(() => ({
    ball:      { x: LAUNCH_X, y: LAUNCH_Y, vx: 0, vy: 0, flying: false, scored: false },
    hoop:      { cx: HOOP_CENTER, phase: 0 },
    score:     0,
    made:      0,
    attempted: 0,
    streak:    0,
    timeLeft:  GAME_DURATION,
    flash:     0,
    flashPts:  0,
    missFlash: 0,
  }), [])

  useEffect(() => { stRef.current = mkState() }, [mkState])

  const resetGame = useCallback(() => {
    stRef.current   = mkState()
    lastTimeRef.current = null
    dragRef.current = { active: false, sx: 0, sy: 0, cx: 0, cy: 0 }
    setPhase('playing')
  }, [mkState])

  /* ── Pointer ── */
  const onDown = useCallback((e) => {
    e.preventDefault()
    if (stRef.current?.ball.flying) return
    const rect = canvasRef.current.getBoundingClientRect()
    const sx = (e.clientX - rect.left) * (W / rect.width)
    const sy = (e.clientY - rect.top)  * (H / rect.height)
    dragRef.current = { active: true, sx, sy, cx: sx, cy: sy }
  }, [])

  const onMove = useCallback((e) => {
    e.preventDefault()
    if (!dragRef.current.active) return
    const rect = canvasRef.current.getBoundingClientRect()
    dragRef.current.cx = (e.clientX - rect.left) * (W / rect.width)
    dragRef.current.cy = (e.clientY - rect.top)  * (H / rect.height)
  }, [])

  const onUp = useCallback((e) => {
    e?.preventDefault()
    const drag = dragRef.current
    if (!drag.active) return
    drag.active = false

    const st = stRef.current
    if (!st || st.ball.flying) return

    const dx = drag.cx - drag.sx
    const dy = drag.cy - drag.sy
    if (dy > -25) return   // must swipe upward

    let vx = dx * SWIPE_FACTOR
    let vy = dy * SWIPE_FACTOR
    const spd = Math.hypot(vx, vy)
    if (spd > MAX_SPEED) { vx = vx / spd * MAX_SPEED; vy = vy / spd * MAX_SPEED }

    st.ball   = { x: LAUNCH_X, y: LAUNCH_Y, vx, vy, flying: true, scored: false }
    st.attempted += 1
  }, [])

  /* ── RAF loop ── */
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function tick(ts) {
      if (!lastTimeRef.current) lastTimeRef.current = ts
      const dt = Math.min((ts - lastTimeRef.current) / 16.67, 3)
      lastTimeRef.current = ts

      const st   = stRef.current
      const drag = dragRef.current

      /* Hoop oscillate */
      st.hoop.phase += cfg.hoopSpeed * 0.018 * dt
      st.hoop.cx     = HOOP_CENTER + Math.sin(st.hoop.phase) * HOOP_TRAVEL

      /* Ball physics */
      if (st.ball.flying) {
        st.ball.vy += GRAVITY * dt
        st.ball.x  += st.ball.vx * dt
        st.ball.y  += st.ball.vy * dt

        /* Score check: ball passes through rim going UPWARD */
        if (!st.ball.scored && st.ball.vy < 0 &&
            st.ball.y <= HOOP_Y + 6 && st.ball.y >= HOOP_Y - 20) {
          const dist = Math.abs(st.ball.x - st.hoop.cx)
          if (dist < cfg.rimHalf - 6) {
            const isSwish = dist < cfg.rimHalf * 0.35
            const pts     = isSwish ? 3 : 2
            st.score  += pts
            st.made   += 1
            st.streak += 1
            st.flashPts = pts
            st.flash    = 65
            st.ball.scored = true
          }
        }

        /* Ball hits rim edge → deflect */
        if (!st.ball.scored && st.ball.vy < 0 &&
            st.ball.y >= HOOP_Y - 20 && st.ball.y <= HOOP_Y + 6) {
          const distL = Math.abs(st.ball.x - (st.hoop.cx - cfg.rimHalf))
          const distR = Math.abs(st.ball.x - (st.hoop.cx + cfg.rimHalf))
          if (distL < 8) { st.ball.vx = -Math.abs(st.ball.vx) * 0.5; st.ball.vy *= 0.6 }
          if (distR < 8) { st.ball.vx =  Math.abs(st.ball.vx) * 0.5; st.ball.vy *= 0.6 }
        }

        /* Miss: scored but still flying — track through net */
        if (st.ball.scored && st.ball.vy > 0 && st.ball.y > HOOP_Y + NET_DEPTH + 10) {
          st.ball = { x: LAUNCH_X, y: LAUNCH_Y, vx: 0, vy: 0, flying: false, scored: false }
        }

        /* Off screen → miss */
        if (!st.ball.scored &&
            (st.ball.y > H + 40 || st.ball.y < -60 || st.ball.x < -40 || st.ball.x > W + 40)) {
          st.streak   = 0
          st.missFlash = 35
          st.ball = { x: LAUNCH_X, y: LAUNCH_Y, vx: 0, vy: 0, flying: false, scored: false }
        }
      }

      /* Flash decay */
      if (st.flash     > 0) st.flash    -= dt
      if (st.missFlash > 0) st.missFlash -= dt

      /* Timer */
      st.timeLeft -= dt / 60
      if (st.timeLeft <= 0) {
        recordGame?.({ game: 'hoops', score: st.score, mode: 'solo', won: st.score > 0 })
        setFinals({ score: st.score, made: st.made, att: st.attempted })
        setPhase('done')
        return
      }

      /* ── Draw ── */
      drawCourt(ctx)
      drawHoop(ctx, st.hoop.cx, cfg.rimHalf)

      /* Trajectory preview while dragging */
      if (drag.active && !st.ball.flying) {
        const dx = drag.cx - drag.sx
        const dy = drag.cy - drag.sy
        if (dy < -25) {
          let pvx = dx * SWIPE_FACTOR
          let pvy = dy * SWIPE_FACTOR
          const spd = Math.hypot(pvx, pvy)
          if (spd > MAX_SPEED) { pvx = pvx/spd*MAX_SPEED; pvy = pvy/spd*MAX_SPEED }
          const pts = simArc(LAUNCH_X, LAUNCH_Y, pvx, pvy)
          pts.forEach((p, i) => {
            if (i % 5 === 0) {
              const a = 0.6 - (i / pts.length) * 0.5
              ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
              ctx.fillStyle = `rgba(255,215,0,${a})`; ctx.fill()
            }
          })
        }
      }

      drawBall(ctx, st.ball.x, st.ball.y)

      /* Glow behind hoop when aligned */
      const dist2 = Math.abs(st.hoop.cx - LAUNCH_X)
      if (dist2 < cfg.rimHalf && !st.ball.flying) {
        ctx.beginPath(); ctx.arc(LAUNCH_X, HOOP_Y, 14, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,255,136,${0.2 * (1 - dist2 / cfg.rimHalf)})`; ctx.fill()
      }

      /* Points float */
      if (st.flash > 0) {
        const a   = Math.min(1, st.flash / 30)
        const rise = (65 - st.flash) * 1.2
        ctx.fillStyle   = `rgba(255,215,0,${a})`
        ctx.font        = `bold ${24 + rise * 0.2}px monospace`
        ctx.textAlign   = 'center'
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12
        ctx.fillText(`+${st.flashPts}`, st.hoop.cx, HOOP_Y - 22 - rise)
        ctx.shadowBlur  = 0
      }
      if (st.missFlash > 0) {
        const a = st.missFlash / 35
        ctx.fillStyle = `rgba(255,0,110,${a})`; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'
        ctx.fillText('MISS', LAUNCH_X, HOOP_Y - 30)
      }

      /* HUD */
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left'
      ctx.fillText(`${st.score} PTS`, 14, 26)
      if (st.streak >= 3) {
        ctx.fillStyle = '#ff006e'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right'
        ctx.fillText(`${st.streak} IN A ROW`, W - 14, 26)
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '10px monospace'; ctx.textAlign = 'right'
        ctx.fillText(`${st.made}/${st.attempted}`, W - 14, 26)
      }
      const ratio  = Math.max(0, st.timeLeft / GAME_DURATION)
      const barClr = ratio > 0.4 ? '#ffd700' : ratio > 0.2 ? '#ff8c00' : '#ff006e'
      ctx.fillStyle = 'rgba(255,215,0,0.10)'; ctx.fillRect(0, H - 4, W, 4)
      ctx.fillStyle = barClr; ctx.fillRect(0, H - 4, W * ratio, 4)
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = '10px monospace'; ctx.textAlign = 'center'
      ctx.fillText(`${Math.ceil(st.timeLeft)}s`, W / 2, 26)

      /* Swipe hint */
      if (st.timeLeft > GAME_DURATION - 3 && !st.ball.flying) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '11px monospace'; ctx.textAlign = 'center'
        ctx.fillText('SWIPE UP TO SHOOT', W / 2, H - 110)
      }

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

  return (
    <div style={{ background: '#08081a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={W} height={H}
        style={{ display: 'block', maxWidth: '100%', touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      <p style={{
        fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.18)',
        letterSpacing: '0.12em', padding: '10px 0 20px',
      }}>
        SWIPE UP · AIM FOR THE MOVING HOOP
      </p>
    </div>
  )
}
