import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const W = 390
const H = 580
const PADDLE_H  = 12
const BALL_R    = 8
const WIN_SCORE = 7

const DIFF = {
  easy:   { paddleW: 95,  aiSpeed: 3.8, ballSpeed: 6.0,  aiErrorPx: 22 },
  medium: { paddleW: 76,  aiSpeed: 5.8, ballSpeed: 8.0,  aiErrorPx: 8  },
  hard:   { paddleW: 58,  aiSpeed: 8.5, ballSpeed: 11.0, aiErrorPx: 2  },
}

const PLAYER_Y = H - 30
const AI_Y     = 28

function launchBall(towardPlayer = true) {
  const angle = (Math.random() * 60 - 30) * (Math.PI / 180)
  const dir   = towardPlayer ? 1 : -1
  return {
    x: W / 2, y: H / 2,
    vx: Math.sin(angle) * 1,
    vy: dir * Math.cos(angle),
  }
}

function initState(cfg) {
  const ball = launchBall(true)
  return {
    ball:        { ...ball, vx: ball.vx * cfg.ballSpeed, vy: ball.vy * cfg.ballSpeed },
    playerX:     W / 2,
    aiX:         W / 2,
    playerScore: 0,
    aiScore:     0,
    flash:       0,
    flashColor:  '#00f5ff',
    paused:      60, // startup pause frames
    gameOver:    false,
    won:         false,
  }
}

export default function PongGame({ difficulty = 'medium', onFinish }) {
  const navigate  = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef   = useRef(null)
  const stRef       = useRef(initState(cfg))
  const rafRef      = useRef(null)
  const lastTimeRef = useRef(null)
  const pointerXRef = useRef(W / 2)   // tracks live pointer X
  const touchActiveRef = useRef(false)

  const [phase, setPhase]         = useState('playing')
  const [finalScore, setFinalScore] = useState(0)
  const [won, setWon]               = useState(false)

  const resetRound = useCallback((playerScored) => {
    const st  = stRef.current
    const cfg2 = DIFF[difficulty] || DIFF.medium
    const ball = launchBall(!playerScored)
    const spd  = cfg2.ballSpeed + (st.playerScore + st.aiScore) * 0.08
    st.ball    = { ...ball, vx: ball.vx * spd, vy: ball.vy * spd }
    st.paused  = 45
  }, [difficulty])

  const resetGame = useCallback(() => {
    stRef.current   = initState(cfg)
    pointerXRef.current = W / 2
    lastTimeRef.current = null
    setPhase('playing')
  }, [cfg])

  // Pointer/touch tracking for player paddle
  const handlePointerMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect   = canvas.getBoundingClientRect()
    const scaleX = W / rect.width
    pointerXRef.current = (e.clientX - rect.left) * scaleX
  }, [])

  const handleTouchMove = useCallback((e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas || !e.touches[0]) return
    const rect   = canvas.getBoundingClientRect()
    const scaleX = W / rect.width
    pointerXRef.current = (e.touches[0].clientX - rect.left) * scaleX
    touchActiveRef.current = true
  }, [])

  const handleTouchEnd = useCallback(() => {
    touchActiveRef.current = false
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

      const st  = stRef.current
      const cfg2 = DIFF[difficulty] || DIFF.medium

      // Startup / respawn pause
      if (st.paused > 0) {
        st.paused -= dt
        drawFrame(ctx, st, cfg2)
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // Move player paddle toward pointer
      const halfW  = cfg2.paddleW / 2
      const targetX = Math.max(halfW, Math.min(W - halfW, pointerXRef.current))
      const diff    = targetX - st.playerX
      st.playerX   += diff * Math.min(0.28 * dt, 1)

      // AI paddle: track ball with error + speed cap
      const aiTarget = st.ball.x + (Math.random() - 0.5) * cfg2.aiErrorPx
      const aiDiff   = aiTarget - st.aiX
      const aiMove   = Math.sign(aiDiff) * Math.min(Math.abs(aiDiff), cfg2.aiSpeed * dt)
      st.aiX = Math.max(halfW, Math.min(W - halfW, st.aiX + aiMove))

      // Move ball
      st.ball.x += st.ball.vx * dt
      st.ball.y += st.ball.vy * dt

      // Wall bounce (left/right)
      if (st.ball.x - BALL_R < 0) {
        st.ball.x  = BALL_R
        st.ball.vx = Math.abs(st.ball.vx)
      }
      if (st.ball.x + BALL_R > W) {
        st.ball.x  = W - BALL_R
        st.ball.vx = -Math.abs(st.ball.vx)
      }

      // Player paddle collision (bottom)
      const pLeft  = st.playerX - halfW
      const pRight = st.playerX + halfW
      if (
        st.ball.vy > 0 &&
        st.ball.y + BALL_R >= PLAYER_Y - PADDLE_H / 2 &&
        st.ball.y - BALL_R <= PLAYER_Y + PADDLE_H / 2 &&
        st.ball.x >= pLeft && st.ball.x <= pRight
      ) {
        st.ball.y  = PLAYER_Y - PADDLE_H / 2 - BALL_R
        // Angle based on where on paddle it hits (-1 to 1)
        const rel  = (st.ball.x - st.playerX) / halfW
        const spd  = Math.hypot(st.ball.vx, st.ball.vy)
        const newSpd = Math.min(spd * 1.04, 15)
        const angle  = rel * (Math.PI / 3)
        st.ball.vx = Math.sin(angle) * newSpd
        st.ball.vy = -Math.abs(Math.cos(angle) * newSpd)
        st.flash      = 8
        st.flashColor = '#00f5ff'
      }

      // AI paddle collision (top)
      const aLeft  = st.aiX - halfW
      const aRight = st.aiX + halfW
      if (
        st.ball.vy < 0 &&
        st.ball.y - BALL_R <= AI_Y + PADDLE_H / 2 &&
        st.ball.y + BALL_R >= AI_Y - PADDLE_H / 2 &&
        st.ball.x >= aLeft && st.ball.x <= aRight
      ) {
        st.ball.y  = AI_Y + PADDLE_H / 2 + BALL_R
        const rel  = (st.ball.x - st.aiX) / halfW
        const spd  = Math.hypot(st.ball.vx, st.ball.vy)
        const newSpd = Math.min(spd * 1.04, 15)
        const angle  = rel * (Math.PI / 3)
        st.ball.vx = Math.sin(angle) * newSpd
        st.ball.vy = Math.abs(Math.cos(angle) * newSpd)
        st.flash      = 8
        st.flashColor = '#ff006e'
      }

      // Score: ball goes off top or bottom
      if (st.ball.y - BALL_R < 0) {
        // Player scores
        st.playerScore += 1
        st.flash       = 20
        st.flashColor  = '#00ff88'
        if (st.playerScore >= WIN_SCORE) {
          st.gameOver = true
          st.won      = true
        } else {
          resetRound(true)
        }
      } else if (st.ball.y + BALL_R > H) {
        // AI scores
        st.aiScore += 1
        st.flash    = 20
        st.flashColor = '#ff006e'
        if (st.aiScore >= WIN_SCORE) {
          st.gameOver = true
          st.won      = false
        } else {
          resetRound(false)
        }
      }

      // Flash decay
      if (st.flash > 0) st.flash -= dt

      if (st.gameOver) {
        const finalPts = st.playerScore * 100
        recordGame?.({ game: 'pong', score: finalPts, mode: 'solo', won: st.won })
        setFinalScore(finalPts)
        setWon(st.won)
        if (onFinish) { onFinish(finalPts); return }
        setPhase('done')
        return
      }

      drawFrame(ctx, st, cfg2)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, difficulty, resetRound, recordGame])

  function drawFrame(ctx, st, cfg2) {
    // Background
    ctx.fillStyle = '#080818'
    ctx.fillRect(0, 0, W, H)

    // Flash overlay
    if (st.flash > 0) {
      ctx.fillStyle = `${st.flashColor}${Math.floor((st.flash / 20) * 0x22).toString(16).padStart(2, '0')}`
      ctx.fillRect(0, 0, W, H)
    }

    // Center dashed line
    ctx.setLineDash([8, 10])
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    ctx.moveTo(0, H / 2)
    ctx.lineTo(W, H / 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Scores
    ctx.font      = 'bold 40px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0,245,255,0.18)'
    ctx.fillText(st.playerScore, W / 2, H / 2 + 55)
    ctx.fillStyle = 'rgba(255,0,110,0.18)'
    ctx.fillText(st.aiScore, W / 2, H / 2 - 20)

    // Win progress pips (player)
    for (let i = 0; i < WIN_SCORE; i++) {
      ctx.beginPath()
      ctx.arc(W / 2 - (WIN_SCORE - 1) * 10 + i * 20, H / 2 + 28, 4, 0, Math.PI * 2)
      ctx.fillStyle = i < st.playerScore ? '#00f5ff' : 'rgba(0,245,255,0.15)'
      ctx.fill()
    }
    // Win progress pips (AI)
    for (let i = 0; i < WIN_SCORE; i++) {
      ctx.beginPath()
      ctx.arc(W / 2 - (WIN_SCORE - 1) * 10 + i * 20, H / 2 - 36, 4, 0, Math.PI * 2)
      ctx.fillStyle = i < st.aiScore ? '#ff006e' : 'rgba(255,0,110,0.15)'
      ctx.fill()
    }

    const halfW = cfg2.paddleW / 2

    // AI paddle (top)
    const aiGrad = ctx.createLinearGradient(st.aiX - halfW, 0, st.aiX + halfW, 0)
    aiGrad.addColorStop(0, 'rgba(255,0,110,0.3)')
    aiGrad.addColorStop(0.5, '#ff006e')
    aiGrad.addColorStop(1, 'rgba(255,0,110,0.3)')
    ctx.fillStyle   = aiGrad
    ctx.shadowColor = '#ff006e'
    ctx.shadowBlur  = 14
    ctx.beginPath()
    ctx.roundRect(st.aiX - halfW, AI_Y - PADDLE_H / 2, cfg2.paddleW, PADDLE_H, 6)
    ctx.fill()

    // Player paddle (bottom)
    const pGrad = ctx.createLinearGradient(st.playerX - halfW, 0, st.playerX + halfW, 0)
    pGrad.addColorStop(0, 'rgba(0,245,255,0.3)')
    pGrad.addColorStop(0.5, '#00f5ff')
    pGrad.addColorStop(1, 'rgba(0,245,255,0.3)')
    ctx.fillStyle   = pGrad
    ctx.shadowColor = '#00f5ff'
    ctx.shadowBlur  = 14
    ctx.beginPath()
    ctx.roundRect(st.playerX - halfW, PLAYER_Y - PADDLE_H / 2, cfg2.paddleW, PADDLE_H, 6)
    ctx.fill()

    // Ball
    ctx.beginPath()
    ctx.arc(st.ball.x, st.ball.y, BALL_R, 0, Math.PI * 2)
    ctx.fillStyle   = '#ffffff'
    ctx.shadowColor = '#00f5ff'
    ctx.shadowBlur  = 18
    ctx.fill()
    ctx.shadowBlur  = 0

    // Pause countdown dots
    if (st.paused > 0) {
      const dots = Math.ceil(st.paused / 15)
      ctx.font      = 'bold 20px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText('.'.repeat(Math.min(dots, 3)), W / 2, H / 2 + 80)
    }

    // YOU / CPU labels
    ctx.font      = '10px monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(0,245,255,0.35)'
    ctx.fillText('YOU', 12, H - 12)
    ctx.fillStyle = 'rgba(255,0,110,0.35)'
    ctx.fillText('CPU', 12, 18)
  }

  if (phase === 'done') {
    return (
      <ResultScreen
        game="PONG VS AI"
        score={finalScore}
        color={won ? 'green' : 'pink'}
        outcome={won ? 'win' : 'lose'}
        stats={[
          { label: 'YOU',  value: stRef.current.playerScore },
          { label: 'CPU',  value: stRef.current.aiScore     },
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
        className="game-canvas"
        style={{ cursor: 'none' }}
        onPointerMove={handlePointerMove}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchMove}
      />
      <p style={{
        fontFamily: 'monospace',
        fontSize: 10,
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.12em',
        paddingTop: 8,
        paddingBottom: 16,
      }}>
        MOVE YOUR FINGER TO CONTROL THE PADDLE
      </p>
    </div>
  )
}
