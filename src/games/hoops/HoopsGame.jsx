import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const W = 390
const H = 580
const GRAVITY     = 0.38
const GAME_DURATION = 60
const BALL_R      = 14
const LAUNCH_X    = 195
const LAUNCH_Y    = 480

const DIFF = {
  easy:   { hoopMoving: false, rimHalfWidth: 35, hoopSpeed: 0 },
  medium: { hoopMoving: true,  rimHalfWidth: 30, hoopSpeed: 1.2 },
  hard:   { hoopMoving: true,  rimHalfWidth: 25, hoopSpeed: 2.0 },
}

const HOOP_CX = 245
const HOOP_Y  = 150

function drawCourt(ctx) {
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth   = 1

  // Three-point arc (bottom half of a circle centered near bottom center)
  ctx.beginPath()
  ctx.arc(W / 2, H + 60, 220, Math.PI, 0)
  ctx.stroke()

  // Lane box
  ctx.strokeRect(130, H - 140, 130, 140)

  // Center circle at bottom
  ctx.beginPath()
  ctx.arc(W / 2, H, 50, Math.PI, 0)
  ctx.stroke()
}

function drawHoop(ctx, cx, rimHW) {
  const rimY = HOOP_Y

  // Backboard
  ctx.fillStyle   = 'rgba(255,255,255,0.15)'
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth   = 1.5
  ctx.fillRect(cx + rimHW - 5, rimY - 28, 52, 42)
  ctx.strokeRect(cx + rimHW - 5, rimY - 28, 52, 42)

  // Backboard inner square
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.strokeRect(cx + rimHW + 4, rimY - 18, 34, 26)

  // Arm from backboard to rim
  ctx.beginPath()
  ctx.moveTo(cx + rimHW - 5, rimY + 4)
  ctx.lineTo(cx + rimHW, rimY + 4)
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth   = 2
  ctx.stroke()

  // Rim
  ctx.beginPath()
  ctx.moveTo(cx - rimHW, rimY)
  ctx.lineTo(cx + rimHW, rimY)
  ctx.strokeStyle = '#ff6600'
  ctx.lineWidth   = 4
  ctx.shadowColor = '#ff6600'
  ctx.shadowBlur  = 8
  ctx.stroke()
  ctx.shadowBlur  = 0

  // Net (zigzag)
  const netLines = 8
  const netH     = 28
  ctx.beginPath()
  ctx.moveTo(cx - rimHW, rimY)
  const stepX = (rimHW * 2) / netLines
  for (let i = 0; i <= netLines; i++) {
    const nx = cx - rimHW + i * stepX
    const ny = rimY + (i % 2 === 0 ? 0 : netH * 0.6)
    i === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny)
  }
  // bottom of net
  for (let i = netLines; i >= 0; i--) {
    const nx = cx - rimHW + i * stepX
    const ny = rimY + netH * 0.5 + (i % 2 === 0 ? 10 : netH * 0.5)
    ctx.lineTo(nx, Math.min(ny, rimY + netH))
  }
  ctx.strokeStyle = 'rgba(200,200,200,0.45)'
  ctx.lineWidth   = 1
  ctx.stroke()
}

function drawBall(ctx, x, y) {
  // Ball body
  ctx.beginPath()
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2)
  ctx.fillStyle   = '#ff8c00'
  ctx.shadowColor = '#ff8c00'
  ctx.shadowBlur  = 12
  ctx.fill()
  ctx.shadowBlur  = 0

  // Seam lines
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth   = 1.5
  // Vertical seam
  ctx.beginPath()
  ctx.arc(x, y, BALL_R, -Math.PI / 2, Math.PI / 2)
  ctx.stroke()
  // Horizontal
  ctx.beginPath()
  ctx.moveTo(x - BALL_R, y)
  ctx.lineTo(x + BALL_R, y)
  ctx.stroke()
  // Curve seams
  ctx.beginPath()
  ctx.arc(x, y - BALL_R * 0.5, BALL_R * 0.85, 0, Math.PI)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y + BALL_R * 0.5, BALL_R * 0.85, Math.PI, 0)
  ctx.stroke()
}

function simulateTrajectory(vx, vy, steps = 60) {
  const pts = []
  let x = LAUNCH_X, y = LAUNCH_Y, curVy = vy
  for (let i = 0; i < steps; i++) {
    x    += vx
    curVy += GRAVITY
    y    += curVy
    if (y > H + 20 || x < -20 || x > W + 20) break
    pts.push({ x, y })
  }
  return pts
}

export default function HoopsGame({ difficulty = 'medium' }) {
  const navigate  = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef   = useRef(null)
  const rafRef      = useRef(null)
  const lastTimeRef = useRef(null)

  // Game state ref
  const stRef = useRef({
    ball:     { x: LAUNCH_X, y: LAUNCH_Y, vx: 0, vy: 0, flying: false, scored: false },
    hoop:     { cx: HOOP_CX, dir: 1 },
    score:    0,
    made:     0,
    attempted: 0,
    streak:   0,
    timeLeft: GAME_DURATION,
    resetTimer: 0,
  })

  // Drag state (pointer events update this directly, not via React state)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, curX: 0, curY: 0 })

  const [phase, setPhase]     = useState('playing')
  const [finalScore, setFinalScore] = useState(0)
  const [finalMade,  setFinalMade]  = useState(0)
  const [finalAttempted, setFinalAttempted] = useState(0)

  const resetBall = useCallback(() => {
    const st = stRef.current
    st.ball = { x: LAUNCH_X, y: LAUNCH_Y, vx: 0, vy: 0, flying: false, scored: false }
    st.resetTimer = 0
    dragRef.current.active = false
  }, [])

  const resetGame = useCallback(() => {
    stRef.current = {
      ball:      { x: LAUNCH_X, y: LAUNCH_Y, vx: 0, vy: 0, flying: false, scored: false },
      hoop:      { cx: HOOP_CX, dir: 1 },
      score:     0,
      made:      0,
      attempted: 0,
      streak:    0,
      timeLeft:  GAME_DURATION,
      resetTimer: 0,
    }
    dragRef.current = { active: false, startX: 0, startY: 0, curX: 0, curY: 0 }
    lastTimeRef.current = null
    setPhase('playing')
  }, [])

  // Main game loop
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function tick(timestamp) {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const dt = Math.min((timestamp - lastTimeRef.current) / 16.67, 3)
      lastTimeRef.current = timestamp

      const st   = stRef.current
      const drag = dragRef.current

      // Move hoop
      if (cfg.hoopMoving) {
        st.hoop.cx += cfg.hoopSpeed * st.hoop.dir * dt
        if (st.hoop.cx > HOOP_CX + 80) st.hoop.dir = -1
        if (st.hoop.cx < HOOP_CX - 80) st.hoop.dir =  1
      }

      // Ball physics
      if (st.ball.flying) {
        st.ball.vy += GRAVITY * dt
        st.ball.x  += st.ball.vx * dt
        st.ball.y  += st.ball.vy * dt

        // Score detection: ball crosses hoop Y going downward
        if (!st.ball.scored && st.ball.vy > 0 && st.ball.y >= HOOP_Y && st.ball.y <= HOOP_Y + 20) {
          const dist = Math.abs(st.ball.x - st.hoop.cx)
          if (dist < cfg.rimHalfWidth) {
            const isSwish = dist < cfg.rimHalfWidth * 0.4
            const pts     = isSwish ? 3 : 2
            st.score  += pts
            st.made   += 1
            st.streak += 1
            st.ball.scored = true
            st.resetTimer  = 90
          }
        }

        // Rim bounce
        if (!st.ball.scored) {
          const leftRim  = st.hoop.cx - cfg.rimHalfWidth
          const rightRim = st.hoop.cx + cfg.rimHalfWidth
          if (st.ball.y >= HOOP_Y - 4 && st.ball.y <= HOOP_Y + 8) {
            if (Math.abs(st.ball.x - leftRim) < BALL_R) {
              st.ball.vx = Math.abs(st.ball.vx) * 0.6
              st.ball.vy *= 0.7
            }
            if (Math.abs(st.ball.x - rightRim) < BALL_R) {
              st.ball.vx = -Math.abs(st.ball.vx) * 0.6
              st.ball.vy *= 0.7
            }
          }
        }

        // Reset when off screen or after scored
        if (st.ball.scored) {
          st.resetTimer -= dt
          if (st.resetTimer <= 0) resetBall()
        } else if (st.ball.y > H + 30 || st.ball.x < -30 || st.ball.x > W + 30) {
          st.streak = 0
          resetBall()
        }
      }

      // Timer
      st.timeLeft -= dt * (1 / 60)
      if (st.timeLeft <= 0) {
        recordGame?.({ game: 'hoops', score: st.score, mode: 'solo', won: st.score > 0 })
        setFinalScore(st.score)
        setFinalMade(st.made)
        setFinalAttempted(st.attempted)
        setPhase('done')
        return
      }

      // Draw
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#080818'
      ctx.fillRect(0, 0, W, H)

      drawCourt(ctx)
      drawHoop(ctx, st.hoop.cx, cfg.rimHalfWidth)

      // Trajectory preview while dragging
      if (drag.active && !st.ball.flying) {
        const vx = (drag.startX - drag.curX) * 0.045
        const vy = (drag.startY - drag.curY) * 0.045
        const pts = simulateTrajectory(vx, vy)
        ctx.shadowBlur = 0
        pts.forEach((p, i) => {
          if (i % 6 === 0) {
            ctx.beginPath()
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255,255,255,${0.5 - i / pts.length * 0.4})`
            ctx.fill()
          }
        })

        // Drag arrow
        ctx.beginPath()
        ctx.moveTo(drag.startX, drag.startY)
        ctx.lineTo(drag.curX, drag.curY)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth   = 1.5
        ctx.stroke()
      }

      drawBall(ctx, st.ball.x, st.ball.y)

      // Score / streak text
      ctx.shadowBlur  = 0
      ctx.fillStyle   = '#ffd700'
      ctx.font        = 'bold 14px monospace'
      ctx.textAlign   = 'left'
      ctx.fillText(`SCORE: ${st.score}`, 12, 26)

      if (st.streak >= 3) {
        ctx.fillStyle   = '#ff006e'
        ctx.font        = 'bold 11px monospace'
        ctx.textAlign   = 'center'
        ctx.fillText(`HOT STREAK x${st.streak}`, W / 2, 48)
      }

      ctx.fillStyle   = 'rgba(255,255,255,0.4)'
      ctx.font        = '11px monospace'
      ctx.textAlign   = 'right'
      ctx.fillText(`${st.made}/${st.attempted} MADE`, W - 12, 26)

      // Timer bar
      const ratio = Math.max(0, st.timeLeft / GAME_DURATION)
      ctx.fillStyle = 'rgba(255,215,0,0.15)'
      ctx.fillRect(0, H - 5, W, 5)
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(0, H - 5, W * ratio, 5)

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, cfg, resetBall, recordGame])

  // Pointer handlers
  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top)  * scaleY
    if (!stRef.current.ball.flying) {
      dragRef.current = { active: true, startX: x, startY: y, curX: x, curY: y }
    }
  }, [])

  const handlePointerMove = useCallback((e) => {
    e.preventDefault()
    if (!dragRef.current.active) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    dragRef.current.curX = (e.clientX - rect.left) * scaleX
    dragRef.current.curY = (e.clientY - rect.top)  * scaleY
  }, [])

  const handlePointerUp = useCallback((e) => {
    e.preventDefault()
    const drag = dragRef.current
    if (!drag.active) return
    drag.active = false

    const st = stRef.current
    if (st.ball.flying) return

    const vx = (drag.startX - drag.curX) * 0.045
    const vy = (drag.startY - drag.curY) * 0.045

    // Only shoot if there's meaningful drag
    if (Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3) {
      st.ball.vx     = vx
      st.ball.vy     = vy
      st.ball.flying = true
      st.ball.scored = false
      st.attempted  += 1
    }
  }, [])

  if (phase === 'done') {
    const acc = finalAttempted > 0 ? Math.round((finalMade / finalAttempted) * 100) + '%' : '0%'
    return (
      <ResultScreen
        game="HOOP SHOTS"
        score={finalScore}
        color="gold"
        stats={[
          { label: 'MADE',  value: finalMade },
          { label: 'SHOTS', value: finalAttempted },
          { label: 'ACC',   value: acc },
        ]}
        onPlayAgain={resetGame}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <div className="flex flex-col items-center" style={{ background: '#080818', minHeight: '100vh' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', maxWidth: '100%', touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <p style={{
        fontFamily: 'monospace',
        fontSize: 10,
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: '0.12em',
        paddingTop: 8,
        paddingBottom: 16,
      }}>
        DRAG &amp; RELEASE TO SHOOT
      </p>
    </div>
  )
}
