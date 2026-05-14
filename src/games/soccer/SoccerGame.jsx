import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

/* ─── Canvas & layout ────────────────────────────────────────────────── */
const W = 390
const H = 580

/* Goal geometry */
const GOAL_LEFT  = 70
const GOAL_RIGHT = 320
const GOAL_TOP   = 60
const GOAL_BOT   = 148
const GOAL_MID_Y = (GOAL_TOP + GOAL_BOT) / 2   // ~104

/* Ball */
const BALL_START_X = W / 2
const BALL_START_Y = 455
const BALL_R       = 16

/* GK */
const GK_Y      = GOAL_TOP + 14
const GK_W      = 58
const GK_H      = 52
const GK_MIN_X  = GOAL_LEFT  + GK_W / 2 + 6
const GK_MAX_X  = GOAL_RIGHT - GK_W / 2 - 6

const GAME_DURATION = 60

const DIFF = {
  easy:   { gkSpeed: 2.2, gkReact: 28, gkOscSpeed: 1.0, label: 'ROOKIE'     },
  medium: { gkSpeed: 4.5, gkReact: 18, gkOscSpeed: 1.7, label: 'CHALLENGER' },
  hard:   { gkSpeed: 7.0, gkReact: 10, gkOscSpeed: 2.5, label: 'VETERAN'    },
}

/* ─── Draw helpers ───────────────────────────────────────────────────── */

function drawPitch(ctx) {
  // Grass gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0a2e0a')
  grad.addColorStop(1, '#0d3d0d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Pitch stripes
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.02)'
    ctx.fillRect(i * (W / 6), 0, W / 6, H)
  }

  // Centre circle
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(W / 2, H - 50, 70, Math.PI, 0); ctx.stroke()

  // Penalty spot circle
  ctx.beginPath(); ctx.arc(BALL_START_X, BALL_START_Y, 3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill()

  // Penalty area box
  ctx.strokeRect(40, GOAL_BOT, W - 80, 180)

  // Goal area inner box
  ctx.strokeRect(115, GOAL_BOT, 160, 80)
}

function drawGoal(ctx) {
  const netColor = 'rgba(255,255,255,0.18)'

  // Net back lines (horizontal)
  for (let y = GOAL_TOP + 10; y < GOAL_BOT; y += 18) {
    ctx.beginPath(); ctx.moveTo(GOAL_LEFT + 4, y); ctx.lineTo(GOAL_RIGHT - 4, y)
    ctx.strokeStyle = netColor; ctx.lineWidth = 1; ctx.stroke()
  }
  // Net back lines (vertical)
  for (let x = GOAL_LEFT + 20; x < GOAL_RIGHT; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_TOP + 4); ctx.lineTo(x, GOAL_BOT - 2)
    ctx.strokeStyle = netColor; ctx.lineWidth = 1; ctx.stroke()
  }

  // Posts & crossbar (glowing white)
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round'
  // Left post
  ctx.beginPath(); ctx.moveTo(GOAL_LEFT, GOAL_BOT); ctx.lineTo(GOAL_LEFT, GOAL_TOP); ctx.stroke()
  // Right post
  ctx.beginPath(); ctx.moveTo(GOAL_RIGHT, GOAL_BOT); ctx.lineTo(GOAL_RIGHT, GOAL_TOP); ctx.stroke()
  // Crossbar
  ctx.beginPath(); ctx.moveTo(GOAL_LEFT, GOAL_TOP); ctx.lineTo(GOAL_RIGHT, GOAL_TOP); ctx.stroke()
  ctx.shadowBlur = 0; ctx.lineCap = 'butt'
}

function drawGK(ctx, cx, diving, diveDir) {
  const x = cx - GK_W / 2
  const y = GK_Y

  ctx.save()
  if (diving) {
    ctx.translate(cx, GK_Y + GK_H / 2)
    ctx.rotate(diveDir * Math.PI / 3)
    ctx.translate(-cx, -(GK_Y + GK_H / 2))
  }

  // Body
  ctx.fillStyle   = '#ff006e'
  ctx.shadowColor = '#ff006e'; ctx.shadowBlur = 10
  ctx.fillRect(x + 8, y + 16, GK_W - 16, GK_H - 16)

  // Arms (extended)
  ctx.fillRect(x, y + 18, 10, GK_H - 28)
  ctx.fillRect(x + GK_W - 10, y + 18, 10, GK_H - 28)

  // Head
  ctx.beginPath(); ctx.arc(cx, y + 10, 14, 0, Math.PI * 2)
  ctx.fillStyle = '#ffcba4'; ctx.shadowBlur = 0; ctx.fill()

  ctx.restore()
}

function drawBall(ctx, x, y, spin) {
  // Scale for perspective (larger near bottom, smaller near goal)
  const scale = 0.5 + 0.5 * ((y - GOAL_BOT) / (BALL_START_Y - GOAL_BOT))
  const r = Math.max(6, BALL_R * scale)

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(spin)

  // Ball
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = '#f0f0f0'
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8
  ctx.fill(); ctx.shadowBlur = 0

  // Pentagon patches
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    i === 0 ? ctx.moveTo(Math.cos(a)*r*0.55, Math.sin(a)*r*0.55)
            : ctx.lineTo(Math.cos(a)*r*0.55, Math.sin(a)*r*0.55)
  }
  ctx.closePath(); ctx.stroke()

  ctx.restore()
}

function drawArrow(ctx, sx, sy, ex, ey) {
  // Clamp end point for clean look
  const dx = ex - sx; const dy = ey - sy
  const len = Math.hypot(dx, dy)
  if (len < 20) return
  const norm = Math.min(len, 160) / len
  const tx = sx + dx * norm; const ty = sy + dy * norm

  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3; ctx.lineCap = 'round'
  ctx.setLineDash([8, 6])
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke()
  ctx.setLineDash([])

  // Arrow head
  const angle = Math.atan2(ty - sy, tx - sx)
  ctx.fillStyle = '#ffd700'
  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.lineTo(tx - 14 * Math.cos(angle - 0.4), ty - 14 * Math.sin(angle - 0.4))
  ctx.lineTo(tx - 14 * Math.cos(angle + 0.4), ty - 14 * Math.sin(angle + 0.4))
  ctx.closePath(); ctx.fill()
  ctx.restore()
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function SoccerGame({ difficulty = 'medium' }) {
  const navigate = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef   = useRef(null)
  const stRef       = useRef(null)
  const rafRef      = useRef(null)
  const lastTimeRef = useRef(null)

  const dragRef = useRef({ active: false, sx: 0, sy: 0, cx: 0, cy: 0 })

  const [phase,  setPhase]  = useState('playing')
  const [finals, setFinals] = useState({ score: 0, goals: 0, shots: 0 })

  const mkState = useCallback(() => ({
    ball:     { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, flying: false, spin: 0, scored: false },
    gk:       { cx: W / 2, dir: 1, phase: 0, diving: false, diveDir: 0, divePower: 0 },
    score:    0,
    goals:    0,
    shots:    0,
    timeLeft: GAME_DURATION,
    flashMsg: '',
    flashFrames: 0,
    resetFrames: 0,
  }), [])

  const resetGame = useCallback(() => {
    stRef.current   = mkState()
    lastTimeRef.current = null
    dragRef.current = { active: false, sx: 0, sy: 0, cx: 0, cy: 0 }
    setPhase('playing')
  }, [mkState])

  useEffect(() => {
    stRef.current = mkState()
  }, [mkState])

  /* pointer handlers */
  const onDown = useCallback((e) => {
    e.preventDefault()
    const st = stRef.current
    if (!st || st.ball.flying) return
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

    // Need upward swipe (dy < -20) to shoot
    if (dy > -20) return

    const FACTOR = 0.19
    const vx = dx * FACTOR
    const vy = Math.max(dy * FACTOR, -22)   // cap upward velocity

    st.ball.vx     = vx
    st.ball.vy     = vy
    st.ball.flying = true
    st.ball.scored = false
    st.shots      += 1

    // GK reacts after 'gkReact' frames (moves toward ball x)
    st.gk._reactIn   = cfg.gkReact
    st.gk._targetX   = BALL_START_X + vx * 38  // predict where ball goes near goal
    st.gk._diving     = false
  }, [cfg])

  /* main loop */
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

      /* GK oscillate (pre-kick) */
      if (!st.ball.flying) {
        st.gk.phase += cfg.gkOscSpeed * 0.02 * dt
        st.gk.cx     = W / 2 + Math.sin(st.gk.phase) * 80
        st.gk.diving = false
      } else {
        /* GK react */
        if (st.gk._reactIn > 0) {
          st.gk._reactIn -= dt
        } else {
          // dive / move toward predicted ball
          const targetX = Math.max(GK_MIN_X, Math.min(GK_MAX_X, st.gk._targetX))
          const diff    = targetX - st.gk.cx
          const move    = Math.sign(diff) * Math.min(Math.abs(diff), cfg.gkSpeed * dt)
          st.gk.cx    += move
          st.gk.diving = Math.abs(diff) > 40
          st.gk.diveDir = Math.sign(diff)
        }
      }

      /* Ball physics */
      if (st.ball.flying) {
        st.ball.x   += st.ball.vx * dt
        st.ball.y   += st.ball.vy * dt
        st.ball.spin += st.ball.vx * 0.04 * dt

        // Very slight deceleration (air resistance)
        st.ball.vx *= Math.pow(0.995, dt)

        // Gravity-like pull upward toward goal (arcade feel)
        // Actually: no gravity. The ball travels at constant velocity for arcade feel
        // But add slight vy increase for natural curve
        if (st.ball.vy < 0) st.ball.vy += 0.08 * dt

        /* Score check: ball crosses crossbar */
        if (!st.ball.scored && st.ball.y <= GOAL_BOT && st.ball.y >= GOAL_TOP - 20) {
          const inPost = st.ball.x > GOAL_LEFT + 8 && st.ball.x < GOAL_RIGHT - 8
          const gkCovers = Math.abs(st.ball.x - st.gk.cx) < GK_W / 2 + 4
          if (inPost && !gkCovers) {
            st.goals   += 1
            st.score   += 100
            st.flashMsg   = 'GOAL!'
            st.flashFrames = 70
            st.ball.scored = true
          } else if (st.ball.y <= GOAL_BOT && st.ball.y >= GOAL_TOP) {
            st.flashMsg    = gkCovers ? 'SAVED!' : 'WIDE!'
            st.flashFrames = 50
            st.ball.scored = true   // flag so we don't double count
          }
          st.resetFrames = 60
        }

        /* Reset after leaving screen */
        if (st.ball.y < GOAL_TOP - 60 || st.ball.x < -40 || st.ball.x > W + 40 ||
            (st.ball.scored && (st.resetFrames -= dt) <= 0)) {
          if (!st.ball.scored) { st.flashMsg = 'WIDE!'; st.flashFrames = 50 }
          st.ball = { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, flying: false, spin: 0, scored: false }
        }
      }

      /* Flash decay */
      if (st.flashFrames > 0) st.flashFrames -= dt

      /* Timer */
      st.timeLeft -= dt / 60
      if (st.timeLeft <= 0) {
        recordGame?.({ game: 'soccer', score: st.score, mode: 'solo', won: st.goals > 0 })
        setFinals({ score: st.score, goals: st.goals, shots: st.shots })
        setPhase('done')
        return
      }

      /* ─── Draw ─── */
      drawPitch(ctx)
      drawGoal(ctx)
      drawGK(ctx, st.gk.cx, st.gk.diving, st.gk.diveDir)
      drawBall(ctx, st.ball.x, st.ball.y, st.ball.spin)

      /* Aim arrow while dragging */
      if (drag.active && !st.ball.flying) {
        drawArrow(ctx, BALL_START_X, BALL_START_Y, drag.cx, drag.cy)
      }

      /* GOAL / SAVED / WIDE flash */
      if (st.flashFrames > 0) {
        const isGoal = st.flashMsg === 'GOAL!'
        const a = Math.min(1, st.flashFrames / 30)
        ctx.fillStyle = isGoal ? `rgba(0,255,136,${a * 0.15})` : `rgba(255,0,110,${a * 0.1})`
        ctx.fillRect(0, 0, W, H)

        ctx.font      = `bold ${isGoal ? 52 : 38}px monospace`
        ctx.textAlign = 'center'
        ctx.fillStyle = isGoal ? `rgba(0,255,136,${a})` : `rgba(255,100,100,${a})`
        ctx.shadowColor = isGoal ? '#00ff88' : '#ff006e'
        ctx.shadowBlur  = 20
        ctx.fillText(st.flashMsg, W / 2, H / 2 - 30)
        ctx.shadowBlur = 0
      }

      /* HUD */
      ctx.fillStyle = '#00ff88'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left'
      ctx.fillText(`${st.goals} GOALS`, 14, 26)
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '10px monospace'; ctx.textAlign = 'right'
      ctx.fillText(`${st.goals}/${st.shots}`, W - 14, 26)

      const ratio = Math.max(0, st.timeLeft / GAME_DURATION)
      const barClr = ratio > 0.4 ? '#00ff88' : ratio > 0.2 ? '#ffd700' : '#ff006e'
      ctx.fillStyle = 'rgba(0,255,136,0.10)'; ctx.fillRect(0, H - 4, W, 4)
      ctx.fillStyle = barClr; ctx.fillRect(0, H - 4, W * ratio, 4)
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = '10px monospace'; ctx.textAlign = 'center'
      ctx.fillText(`${Math.ceil(st.timeLeft)}s`, W / 2, 26)

      /* Swipe hint (first few seconds) */
      if (st.timeLeft > GAME_DURATION - 3 && !st.ball.flying) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.font = '11px monospace'; ctx.textAlign = 'center'
        ctx.fillText('SWIPE UP TO SHOOT', W / 2, H - 24)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, cfg, recordGame])

  if (phase === 'done') {
    const acc = finals.shots > 0 ? Math.round(finals.goals / finals.shots * 100) + '%' : '0%'
    return (
      <ResultScreen
        game="PENALTY SHOOTOUT"
        score={finals.score}
        color="green"
        stats={[
          { label: 'GOALS', value: finals.goals },
          { label: 'SHOTS', value: finals.shots },
          { label: 'RATE',  value: acc           },
        ]}
        onPlayAgain={resetGame}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <div style={{ background: '#0a1a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={W} height={H}
        style={{ display: 'block', maxWidth: '100%', touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
    </div>
  )
}
