import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

/* ─── Canvas & layout ────────────────────────────────────────────────── */
const W = 390
const H = 580

/* Goal geometry */
const GOAL_LEFT  = 72
const GOAL_RIGHT = 318
const GOAL_TOP   = 58
const GOAL_BOT   = 148
const GOAL_MID_Y = (GOAL_TOP + GOAL_BOT) / 2   // ~103
const GOAL_W     = GOAL_RIGHT - GOAL_LEFT        // 246

/* Ball start (penalty spot) */
const BALL_X = W / 2
const BALL_Y = 462
const BALL_R = 16

/* GK */
const GK_Y     = GOAL_TOP + 14
const GK_W     = 56
const GK_H     = 52
const GK_MIN_X = GOAL_LEFT  + GK_W / 2 + 4   // 108
const GK_MAX_X = GOAL_RIGHT - GK_W / 2 - 4   // 282
const GK_RANGE = GK_MAX_X - GK_MIN_X           // 174

/* Drag mechanic */
const MAX_DRAG_BACK = 110  // full power requires pulling back 110px
const MIN_DRAG_BACK = 22   // must pull at least 22px to shoot
const MAX_AIM_DRAG  = 88   // full side-aim requires 88px horizontal drag
const AIM_SPREAD    = 112  // px offset from goal center at max aim

/* Game format */
const SHOTS_TOTAL = 10

/* ─── Difficulty ──────────────────────────────────────────────────────── */
const DIFF = {
  easy:   { gkSpd: 3.0,  readBias: 0.12, patternBias: 0.00, label: 'ROOKIE'     },
  medium: { gkSpd: 6.2,  readBias: 0.38, patternBias: 0.18, label: 'CHALLENGER' },
  hard:   { gkSpd: 10.0, readBias: 0.55, patternBias: 0.32, label: 'VETERAN'    },
}

/* ─── Draw helpers ───────────────────────────────────────────────────── */
function drawPitch(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#071807')
  grad.addColorStop(1, '#092809')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Pitch stripes
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.022)'
    ctx.fillRect(i * (W / 7), 0, W / 7, H)
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5
  // Penalty area
  ctx.strokeRect(36, GOAL_BOT, W - 72, 170)
  // Goal area
  ctx.strokeRect(118, GOAL_BOT, 154, 66)
  // Penalty spot
  ctx.beginPath(); ctx.arc(BALL_X, BALL_Y, 3.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fill()
}

function drawGoal(ctx) {
  // Net lines horizontal
  for (let y = GOAL_TOP + 10; y < GOAL_BOT; y += 15) {
    ctx.beginPath(); ctx.moveTo(GOAL_LEFT + 4, y); ctx.lineTo(GOAL_RIGHT - 4, y)
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke()
  }
  // Net lines vertical
  for (let x = GOAL_LEFT + 18; x < GOAL_RIGHT; x += 24) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_TOP + 4); ctx.lineTo(x, GOAL_BOT - 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke()
  }
  // Posts
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5.5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(GOAL_LEFT, GOAL_BOT); ctx.lineTo(GOAL_LEFT, GOAL_TOP); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(GOAL_RIGHT, GOAL_BOT); ctx.lineTo(GOAL_RIGHT, GOAL_TOP); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(GOAL_LEFT, GOAL_TOP); ctx.lineTo(GOAL_RIGHT, GOAL_TOP); ctx.stroke()
  ctx.shadowBlur = 0; ctx.lineCap = 'butt'
}

function drawGK(ctx, cx, committed, leanDir) {
  const x = cx - GK_W / 2
  const y = GK_Y
  ctx.save()

  if (committed && Math.abs(leanDir) > 0.05) {
    ctx.translate(cx, GK_Y + GK_H / 2)
    ctx.rotate(leanDir * 0.5)
    ctx.translate(-cx, -(GK_Y + GK_H / 2))
  }

  // GK body
  ctx.shadowColor = '#ff006e'; ctx.shadowBlur = 12
  ctx.fillStyle = '#e0005e'
  ctx.fillRect(x + 8, y + 16, GK_W - 16, GK_H - 16)
  // Arms extended
  ctx.fillRect(x - 4, y + 18, 14, GK_H - 28)
  ctx.fillRect(x + GK_W - 10, y + 18, 14, GK_H - 28)
  ctx.shadowBlur = 0
  // Head
  ctx.beginPath(); ctx.arc(cx, y + 10, 15, 0, Math.PI * 2)
  ctx.fillStyle = '#ffcba4'; ctx.fill()
  // Eyes
  ctx.fillStyle = '#333'
  ctx.beginPath(); ctx.arc(cx - 5, y + 8, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 5, y + 8, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawBall(ctx, x, y, spin) {
  // Perspective scale: larger near bottom, smaller at goal
  const t     = Math.max(0, Math.min(1, (y - GOAL_BOT) / (BALL_Y - GOAL_BOT)))
  const scale = 0.42 + 0.58 * t
  const r     = Math.max(4, BALL_R * scale)

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(spin)

  // Shadow
  ctx.beginPath(); ctx.ellipse(0, r * 0.9, r * 0.8, r * 0.22, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill()

  // Ball
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = '#f2f2f2'
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 10
  ctx.fill(); ctx.shadowBlur = 0

  // Pentagon patches
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.2
  for (let ring = 0; ring < 2; ring++) {
    const rr = r * (ring === 0 ? 0.48 : 0.82)
    const sides = ring === 0 ? 5 : 5
    ctx.beginPath()
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + (ring === 0 ? -Math.PI / 2 : 0)
      i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
              : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.closePath()
    if (ring === 0) ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

/* ─── Component ──────────────────────────────────────────────────────── */
export default function SoccerGame({ difficulty = 'medium', onFinish }) {
  const navigate    = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef    = useRef(null)
  const stRef        = useRef(null)
  const rafRef       = useRef(null)
  const lastTimeRef  = useRef(null)
  const dragRef      = useRef({ active: false, sx: 0, sy: 0, cx: 0, cy: 0 })
  const shotHistRef  = useRef([])   // last N aim fractions for pattern reading

  const [phase,  setPhase]  = useState('playing')
  const [finals, setFinals] = useState({ goals: 0 })

  const mkState = useCallback(() => ({
    ball:       { x: BALL_X, y: BALL_Y, vx: 0, vy: 0, flying: false, spin: 0, scored: false },
    gk:         { cx: W / 2, osc: 0, committed: false, commitX: W / 2, leanDir: 0 },
    goals:      0,
    shotsLeft:  SHOTS_TOTAL,
    shotResults: [],   // 'goal' | 'saved' | 'wide' per shot
    flashMsg:   '',
    flashFrames: 0,
    resetTimer: 0,
    gameOver:   false,
  }), [])

  const resetGame = useCallback(() => {
    stRef.current   = mkState()
    lastTimeRef.current = null
    dragRef.current = { active: false, sx: 0, sy: 0, cx: 0, cy: 0 }
    shotHistRef.current = []
    setPhase('playing')
  }, [mkState])

  useEffect(() => { stRef.current = mkState() }, [mkState])

  /* ── Pointer / touch handlers ── */
  const onDown = useCallback((e) => {
    e.preventDefault()
    const st = stRef.current
    if (!st || st.ball.flying || st.shotsLeft <= 0 || st.gameOver) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = (e.clientX - rect.left) * (W / rect.width)
    const cy = (e.clientY - rect.top)  * (H / rect.height)
    // Only activate if touch is near the ball
    if (Math.hypot(cx - BALL_X, cy - BALL_Y) < 90) {
      dragRef.current = { active: true, sx: cx, sy: cy, cx, cy }
    }
  }, [])

  const onMove = useCallback((e) => {
    e.preventDefault()
    if (!dragRef.current.active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    dragRef.current.cx = (e.clientX - rect.left) * (W / rect.width)
    dragRef.current.cy = (e.clientY - rect.top)  * (H / rect.height)
  }, [])

  const onUp = useCallback((e) => {
    e?.preventDefault()
    const drag = dragRef.current
    if (!drag.active) return
    drag.active = false

    const st = stRef.current
    if (!st || st.ball.flying || st.shotsLeft <= 0) return

    // dragBack = how far player pulled DOWNWARD (back from goal)
    const dragBack = Math.max(0, drag.cy - drag.sy)
    if (dragBack < MIN_DRAG_BACK) return  // too short, no shot

    const dragX   = drag.cx - drag.sx
    const power   = Math.min(dragBack / MAX_DRAG_BACK, 1)
    const aimFrac = Math.max(-1, Math.min(1, dragX / MAX_AIM_DRAG))

    // Calculate ball velocity toward aim target
    const targetX  = W / 2 + aimFrac * AIM_SPREAD
    const dx       = targetX - BALL_X
    const dy       = GOAL_MID_Y - BALL_Y          // negative = upward
    const dist     = Math.hypot(dx, dy)
    const speed    = 9 + power * 17                // 9–26 px/frame
    const frames   = dist / speed

    st.ball.vx     = dx / frames
    st.ball.vy     = dy / frames
    st.ball.flying = true
    st.ball.scored = false
    st.shotsLeft  -= 1

    // ─ GK commits to a dive ─
    // Build pattern prediction from shot history
    const hist       = shotHistRef.current
    const patternAvg = hist.length > 0
      ? hist.reduce((s, v) => s + v, 0) / hist.length
      : 0
    shotHistRef.current = [...hist.slice(-4), aimFrac]  // keep last 5

    const randFrac   = Math.random() * 2 - 1
    const rw         = Math.max(0, 1 - cfg.readBias - cfg.patternBias)
    const predicted  = rw * randFrac + cfg.readBias * aimFrac + cfg.patternBias * patternAvg
    const clampedPred = Math.max(-1, Math.min(1, predicted))
    const commitX    = GK_MIN_X + ((clampedPred + 1) / 2) * GK_RANGE

    st.gk.committed = true
    st.gk.commitX   = Math.max(GK_MIN_X, Math.min(GK_MAX_X, commitX))
    st.gk.leanDir   = Math.sign(clampedPred)
    st.resetTimer   = 0
  }, [cfg])

  /* ── Main RAF loop ── */
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

      /* ── GK movement ── */
      if (!st.ball.flying) {
        // Gentle sway while waiting for shot
        st.gk.osc += 0.022 * dt
        st.gk.cx   = W / 2 + Math.sin(st.gk.osc) * 52
        st.gk.committed = false
      } else {
        // Dive toward committed position
        const diff = st.gk.commitX - st.gk.cx
        const move = Math.sign(diff) * Math.min(Math.abs(diff), cfg.gkSpd * dt)
        st.gk.cx  += move
      }

      /* ── Ball physics ── */
      if (st.ball.flying) {
        st.ball.x    += st.ball.vx * dt
        st.ball.y    += st.ball.vy * dt
        st.ball.spin += st.ball.vx * 0.05 * dt
        // Slight upward deceleration (natural arc)
        st.ball.vy   += 0.055 * dt

        /* Score check — ball crosses goal zone */
        if (!st.ball.scored && st.ball.y <= GOAL_BOT + 8 && st.ball.y >= GOAL_TOP - 35) {
          const inPost   = st.ball.x > GOAL_LEFT + 5 && st.ball.x < GOAL_RIGHT - 5
          const gkCovers = Math.abs(st.ball.x - st.gk.cx) < (GK_W / 2 + BALL_R * 0.4)

          let shotResult
          if (inPost && !gkCovers) {
            st.goals   += 1
            st.flashMsg    = 'GOAL!'
            st.flashFrames = 88
            shotResult     = 'goal'
          } else if (inPost && gkCovers) {
            st.flashMsg    = 'SAVED!'
            st.flashFrames = 66
            shotResult     = 'saved'
          } else {
            st.flashMsg    = 'WIDE!'
            st.flashFrames = 52
            shotResult     = 'wide'
          }
          st.ball.scored   = true
          st.shotResults   = [...st.shotResults, shotResult]
          st.resetTimer    = st.shotsLeft <= 0 ? 90 : 68
        }

        /* Ball exit / reset */
        const exitedScreen = st.ball.y < GOAL_TOP - 90 ||
                             st.ball.x < -60 || st.ball.x > W + 60
        const timerExpired = st.ball.scored && (st.resetTimer -= dt) <= 0

        if (exitedScreen || timerExpired) {
          if (!st.ball.scored) {
            st.flashMsg    = 'WIDE!'
            st.flashFrames = 50
            st.shotResults = [...st.shotResults, 'wide']
            st.shotsLeft   = Math.max(0, st.shotsLeft - 0)  // already decremented
          }

          if (st.shotsLeft <= 0) {
            // All shots taken — game over
            const finalScore = st.goals * 100
            recordGame?.({ game: 'soccer', score: finalScore, mode: 'solo', won: st.goals > 0 })
            const goalsCopy = st.goals
            setFinals({ goals: goalsCopy, score: finalScore })
            if (onFinish) { onFinish(finalScore); return }
            setPhase('done')
            return
          }

          // Reset for next shot
          st.ball      = { x: BALL_X, y: BALL_Y, vx: 0, vy: 0, flying: false, spin: 0, scored: false }
          st.gk.committed = false
          st.resetTimer   = 0
        }
      }

      /* Flash decay */
      if (st.flashFrames > 0) st.flashFrames -= dt

      /* ─── DRAW ─── */
      drawPitch(ctx)
      drawGoal(ctx)
      drawGK(ctx, st.gk.cx, st.gk.committed, st.gk.leanDir)

      /* Aim guide while dragging */
      const dragBack = Math.max(0, drag.cy - drag.sy)
      const isDragging = drag.active && dragBack > 5 && !st.ball.flying

      if (isDragging) {
        const power   = Math.min(dragBack / MAX_DRAG_BACK, 1)
        const dragX   = drag.cx - drag.sx
        const aimFrac = Math.max(-1, Math.min(1, dragX / MAX_AIM_DRAG))
        const aimX    = W / 2 + aimFrac * AIM_SPREAD

        // Trajectory arc
        ctx.save()
        ctx.globalAlpha = 0.40
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 8])
        ctx.beginPath()
        ctx.moveTo(BALL_X, BALL_Y)
        const cpX = BALL_X + (aimX - BALL_X) * 0.45
        const cpY = BALL_Y - 150
        ctx.quadraticCurveTo(cpX, cpY, aimX, GOAL_MID_Y + 10)
        ctx.stroke()
        ctx.setLineDash([])

        // Aim dot on goal mouth
        ctx.globalAlpha = 0.65
        ctx.beginPath(); ctx.arc(aimX, GOAL_MID_Y + 10, 7, 0, Math.PI * 2)
        ctx.fillStyle = '#ffd700'; ctx.fill()
        ctx.restore()

        // Power bar (left side)
        const barH = 110; const barX = 16; const barY = BALL_Y - barH / 2
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(barX, barY, 12, barH)
        const fill   = power * barH
        const barClr = power < 0.5 ? '#00ff88' : power < 0.82 ? '#ffd700' : '#ff3366'
        ctx.fillStyle   = barClr
        ctx.shadowColor = barClr; ctx.shadowBlur = 10
        ctx.fillRect(barX, barY + barH - fill, 12, fill)
        ctx.shadowBlur = 0
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1
        ctx.strokeRect(barX, barY, 12, barH)
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '8px monospace'; ctx.textAlign = 'center'
        ctx.fillText('PWR', barX + 6, barY - 6)
      }

      drawBall(ctx, st.ball.x, st.ball.y, st.ball.spin)

      /* Flash message */
      if (st.flashFrames > 0) {
        const isGoal  = st.flashMsg === 'GOAL!'
        const isSaved = st.flashMsg === 'SAVED!'
        const a = Math.min(1, st.flashFrames / 25)

        ctx.fillStyle = isGoal
          ? `rgba(0,255,136,${a * 0.12})`
          : `rgba(255,0,110,${a * 0.10})`
        ctx.fillRect(0, 0, W, H)

        ctx.font      = `bold ${isGoal ? 60 : 40}px monospace`
        ctx.textAlign = 'center'
        ctx.fillStyle = isGoal ? `rgba(0,255,136,${a})`
                     : isSaved ? `rgba(255,60,100,${a})`
                     : `rgba(160,160,180,${a})`
        ctx.shadowColor = isGoal ? '#00ff88' : isSaved ? '#ff006e' : '#888'
        ctx.shadowBlur  = isGoal ? 28 : 18
        ctx.fillText(st.flashMsg, W / 2, H / 2 - 30)
        ctx.shadowBlur = 0
      }

      /* ── HUD ── */
      // Goals counter
      ctx.textAlign = 'center'
      ctx.fillStyle = '#00ff88'
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 14
      ctx.font = 'bold 36px monospace'
      ctx.fillText(st.goals, W / 2, H - 74)
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '9px monospace'
      ctx.fillText('GOALS', W / 2, H - 57)

      // Shot pips
      const pipSpacing = 22
      const totalPipW  = SHOTS_TOTAL * pipSpacing - 2
      const pipStartX  = W / 2 - totalPipW / 2 + 8
      for (let i = 0; i < SHOTS_TOTAL; i++) {
        const px = pipStartX + i * pipSpacing
        const py = H - 34
        const res = st.shotResults[i]
        if (res === 'goal') {
          ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2)
          ctx.fillStyle = '#00ff88'
          ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6
          ctx.fill(); ctx.shadowBlur = 0
        } else if (res === 'saved' || res === 'wide') {
          ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2)
          ctx.fillStyle = res === 'saved' ? '#ff006e' : 'rgba(255,255,255,0.18)'; ctx.fill()
        } else if (i === SHOTS_TOTAL - st.shotsLeft) {
          // Current shot pip
          ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2)
          ctx.fillStyle = '#ffd700'
          ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8
          ctx.fill(); ctx.shadowBlur = 0
        } else {
          ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill()
        }
      }

      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '8px monospace'; ctx.textAlign = 'center'
      ctx.fillText(`${st.shotsLeft} SHOTS LEFT`, W / 2, H - 12)

      /* First-shot hint */
      if (!st.ball.flying && st.shotsLeft === SHOTS_TOTAL && !isDragging) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)'
        ctx.font = '11px monospace'; ctx.textAlign = 'center'
        ctx.fillText('DRAG DOWN TO AIM  ·  RELEASE TO SHOOT', W / 2, BALL_Y + 54)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, cfg, recordGame, onFinish])

  if (phase === 'done') {
    return (
      <ResultScreen
        game="PENALTY SHOOTOUT"
        score={finals.goals * 100}
        color="green"
        stats={[
          { label: 'GOALS', value: `${finals.goals} / ${SHOTS_TOTAL}` },
          { label: 'RATE',  value: `${Math.round(finals.goals / SHOTS_TOTAL * 100)}%` },
        ]}
        onPlayAgain={resetGame}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <div style={{ background: '#071807', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={W} height={H}
        className="game-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onContextMenu={e => e.preventDefault()}
      />
    </div>
  )
}
