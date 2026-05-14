import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const W = 390
const H = 580

// Ball physics (per frame at 60fps)
const VY_INIT     = -16    // upward launch velocity
const GRAVITY     = 0.55   // gravity per frame
const LAUNCH_X    = W / 2
const LAUNCH_Y    = H - 90  // ball start position
const HOOP_Y      = 210     // hoop height (ball checked as it crosses going up)
const HOOP_TRAVEL = 115     // how far hoop moves from center each side

const GAME_DURATION = 60

const DIFF = {
  easy:   { rimHalfWidth: 38, hoopSpeed: 1.4, pointsSwish: 3, pointsMake: 2 },
  medium: { rimHalfWidth: 30, hoopSpeed: 2.2, pointsSwish: 3, pointsMake: 2 },
  hard:   { rimHalfWidth: 22, hoopSpeed: 3.2, pointsSwish: 4, pointsMake: 2 },
}

function initState(cfg) {
  return {
    ball:      { x: LAUNCH_X, y: LAUNCH_Y, vy: 0, flying: false, scored: false, miss: false },
    hoop:      { cx: W / 2, dir: 1, phase: 0 },
    score:     0,
    made:      0,
    attempted: 0,
    streak:    0,
    timeLeft:  GAME_DURATION,
    resetFrames: 0,
    lastPoints: 0,
    pointsFlash: 0,
  }
}

function drawHoop(ctx, cx, rimHW) {
  // Backboard
  ctx.fillStyle   = 'rgba(255,255,255,0.12)'
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth   = 1.5
  const bx = cx + rimHW
  ctx.fillRect(bx, HOOP_Y - 32, 44, 36)
  ctx.strokeRect(bx, HOOP_Y - 32, 44, 36)
  // inner square
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.strokeRect(bx + 8, HOOP_Y - 22, 28, 22)

  // Support arm
  ctx.beginPath()
  ctx.moveTo(bx, HOOP_Y + 2)
  ctx.lineTo(cx + rimHW, HOOP_Y + 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth   = 2
  ctx.stroke()

  // Rim glow
  ctx.shadowColor = '#ff6600'
  ctx.shadowBlur  = 10
  ctx.beginPath()
  ctx.moveTo(cx - rimHW, HOOP_Y)
  ctx.lineTo(cx + rimHW, HOOP_Y)
  ctx.strokeStyle = '#ff6600'
  ctx.lineWidth   = 4
  ctx.stroke()
  ctx.shadowBlur = 0

  // Net (zigzag)
  ctx.beginPath()
  const steps   = 8
  const stepW   = (rimHW * 2) / steps
  const netH    = 26
  for (let i = 0; i <= steps; i++) {
    const nx = cx - rimHW + i * stepW
    const ny = HOOP_Y + (i % 2 === 0 ? 2 : netH * 0.65)
    i === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny)
  }
  // bottom sag
  for (let i = steps; i >= 0; i--) {
    const nx = cx - rimHW + i * stepW
    const ny = HOOP_Y + netH * 0.55 + (i % 2 === 0 ? netH * 0.45 : 0)
    ctx.lineTo(nx, Math.min(ny, HOOP_Y + netH))
  }
  ctx.strokeStyle = 'rgba(180,180,180,0.4)'
  ctx.lineWidth   = 1
  ctx.stroke()
}

function drawBall(ctx, x, y) {
  ctx.beginPath()
  ctx.arc(x, y, 18, 0, Math.PI * 2)
  ctx.fillStyle   = '#e8740a'
  ctx.shadowColor = '#ff8c00'
  ctx.shadowBlur  = 16
  ctx.fill()
  ctx.shadowBlur = 0

  // Seams
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth   = 1.8
  ctx.beginPath()
  ctx.moveTo(x - 18, y)
  ctx.lineTo(x + 18, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, 18, -Math.PI / 2, Math.PI / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y - 9,  15, 0, Math.PI)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y + 9,  15, Math.PI, 0)
  ctx.stroke()
}

function drawCourt(ctx) {
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth   = 1

  // Floor line
  ctx.beginPath()
  ctx.moveTo(0, H - 60)
  ctx.lineTo(W, H - 60)
  ctx.stroke()

  // Three-point arc
  ctx.beginPath()
  ctx.arc(W / 2, H - 60, 190, Math.PI, 0)
  ctx.stroke()

  // Lane
  ctx.strokeRect(115, H - 60, 160, -100)

  // Free throw circle
  ctx.beginPath()
  ctx.arc(W / 2, H - 160, 45, Math.PI, 0)
  ctx.stroke()
}

export default function HoopsGame({ difficulty = 'medium' }) {
  const navigate = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef   = useRef(null)
  const stRef       = useRef(initState(cfg))
  const rafRef      = useRef(null)
  const lastTimeRef = useRef(null)
  const shootRef    = useRef(false)  // set true on button press, consumed by loop

  const [phase, setPhase]          = useState('playing')
  const [finalScore, setFinalScore] = useState(0)
  const [finalMade,  setFinalMade]  = useState(0)
  const [finalAtt,   setFinalAtt]   = useState(0)

  const resetGame = useCallback(() => {
    stRef.current   = initState(cfg)
    lastTimeRef.current = null
    setPhase('playing')
  }, [cfg])

  const shoot = useCallback(() => {
    const st = stRef.current
    if (st.ball.flying || st.timeLeft <= 0) return
    shootRef.current = true
  }, [])

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

      // Move hoop
      st.hoop.phase += cfg.hoopSpeed * 0.018 * dt
      st.hoop.cx     = W / 2 + Math.sin(st.hoop.phase) * HOOP_TRAVEL

      // Consume shoot command
      if (shootRef.current && !st.ball.flying) {
        shootRef.current   = false
        st.ball.flying     = true
        st.ball.scored     = false
        st.ball.miss       = false
        st.ball.vy         = VY_INIT
        st.ball.x          = LAUNCH_X
        st.ball.y          = LAUNCH_Y
        st.attempted      += 1
        st.resetFrames     = 0
      }

      // Ball physics
      if (st.ball.flying) {
        st.ball.vy += GRAVITY * dt
        st.ball.y  += st.ball.vy * dt
        // vx is always 0 — ball goes straight up

        // Score detection: ball crosses HOOP_Y going upward (vy < 0)
        if (!st.ball.scored && !st.ball.miss && st.ball.vy < 0 &&
            st.ball.y <= HOOP_Y && st.ball.y >= HOOP_Y - 20) {
          const dist = Math.abs(LAUNCH_X - st.hoop.cx)
          if (dist <= cfg.rimHalfWidth) {
            const isSwish   = dist <= cfg.rimHalfWidth * 0.38
            const pts       = isSwish ? cfg.pointsSwish : cfg.pointsMake
            st.score       += pts
            st.made        += 1
            st.streak      += 1
            st.lastPoints   = pts
            st.pointsFlash  = 60
            st.ball.scored  = true
          } else {
            st.ball.miss   = true
            st.streak      = 0
          }
        }

        // Reset ball after it falls off screen
        if (st.ball.y > H + 40) {
          st.ball = { x: LAUNCH_X, y: LAUNCH_Y, vy: 0, flying: false, scored: false, miss: false }
        }
      }

      // Flash decay
      if (st.pointsFlash > 0) st.pointsFlash -= dt

      // Timer
      st.timeLeft -= dt * (1 / 60)
      if (st.timeLeft <= 0) {
        recordGame?.({ game: 'hoops', score: st.score, mode: 'solo', won: st.score > 0 })
        setFinalScore(st.score)
        setFinalMade(st.made)
        setFinalAtt(st.attempted)
        setPhase('done')
        return
      }

      // ── Draw ──
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#080818'
      ctx.fillRect(0, 0, W, H)

      drawCourt(ctx)
      drawHoop(ctx, st.hoop.cx, cfg.rimHalfWidth)

      // Aim guide — vertical line from ball launch to hoop when not flying
      if (!st.ball.flying) {
        ctx.beginPath()
        ctx.moveTo(LAUNCH_X, LAUNCH_Y - 20)
        ctx.lineTo(LAUNCH_X, HOOP_Y)
        ctx.setLineDash([4, 8])
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'
        ctx.lineWidth   = 1.5
        ctx.stroke()
        ctx.setLineDash([])

        // Sweet-spot indicator on rim
        const dist = Math.abs(LAUNCH_X - st.hoop.cx)
        const inZone = dist <= cfg.rimHalfWidth
        if (inZone) {
          ctx.beginPath()
          ctx.arc(LAUNCH_X, HOOP_Y, 10, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0,255,136,${0.3 + 0.4 * (1 - dist / cfg.rimHalfWidth)})`
          ctx.fill()
        }
      }

      drawBall(ctx, st.ball.x, st.ball.y)

      // Points flash
      if (st.pointsFlash > 0) {
        const a = Math.min(1, st.pointsFlash / 30)
        ctx.fillStyle = `rgba(255,215,0,${a})`
        ctx.font      = `bold ${28 + (60 - st.pointsFlash) * 0.3}px monospace`
        ctx.textAlign = 'center'
        ctx.fillText(`+${st.lastPoints}`, W / 2, HOOP_Y - 30 - (60 - st.pointsFlash))
      }

      // HUD — score
      ctx.shadowBlur  = 0
      ctx.fillStyle   = '#ffd700'
      ctx.font        = 'bold 15px monospace'
      ctx.textAlign   = 'left'
      ctx.fillText(`${st.score} PTS`, 14, 28)

      // Streak
      if (st.streak >= 3) {
        ctx.fillStyle = '#ff006e'
        ctx.font      = 'bold 11px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(`🔥 ${st.streak} IN A ROW`, W - 14, 28)
      } else {
        ctx.fillStyle   = 'rgba(255,255,255,0.3)'
        ctx.font        = '10px monospace'
        ctx.textAlign   = 'right'
        ctx.fillText(`${st.made}/${st.attempted}`, W - 14, 28)
      }

      // Timer bar
      const ratio = Math.max(0, st.timeLeft / GAME_DURATION)
      ctx.fillStyle = 'rgba(255,215,0,0.12)'
      ctx.fillRect(0, H - 5, W, 5)
      const barColor = ratio > 0.4 ? '#ffd700' : ratio > 0.2 ? '#ff8c00' : '#ff006e'
      ctx.fillStyle  = barColor
      ctx.fillRect(0, H - 5, W * ratio, 5)

      // Timer text
      const secs = Math.ceil(st.timeLeft)
      ctx.fillStyle = ratio < 0.2 ? '#ff006e' : 'rgba(255,255,255,0.25)'
      ctx.font      = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${secs}s`, W / 2, 28)

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, cfg, recordGame])

  if (phase === 'done') {
    const acc = finalAtt > 0 ? Math.round((finalMade / finalAtt) * 100) + '%' : '0%'
    return (
      <ResultScreen
        game="HOOP SHOTS"
        score={finalScore}
        color="gold"
        stats={[
          { label: 'MADE',  value: finalMade },
          { label: 'SHOTS', value: finalAtt  },
          { label: 'ACC',   value: acc       },
        ]}
        onPlayAgain={resetGame}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{ background: '#080818', minHeight: '100vh' }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', maxWidth: '100%', touchAction: 'none' }}
      />

      {/* Single shoot button */}
      <div style={{ padding: '16px 0 24px', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button
          onPointerDown={shoot}
          style={{
            width: 200,
            height: 64,
            borderRadius: 16,
            background: 'rgba(255,140,0,0.12)',
            border: '2px solid rgba(255,140,0,0.6)',
            color: '#ff8c00',
            fontFamily: 'monospace',
            fontSize: 18,
            fontWeight: 'bold',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            boxShadow: '0 0 20px rgba(255,140,0,0.15)',
          }}
        >
          SHOOT
        </button>
      </div>
    </div>
  )
}
