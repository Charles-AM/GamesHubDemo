import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const W          = 390
const H          = 520
const GROUND_Y   = H - 80
const PLAYER_X   = 70
const GRAVITY    = 0.55
const JUMP_VEL   = -12.5
const DUCK_H     = 18
const STAND_H    = 36
const PLAYER_W   = 22
const BASE_SPEED = 4.5
const MAX_SPEED  = 11

function rand(min, max) { return Math.random() * (max - min) + min }

// Player shape
function drawPlayer(ctx, p) {
  ctx.save()
  ctx.shadowColor = '#00f5ff'
  ctx.shadowBlur  = 10
  const y  = p.y
  const h  = p.ducking ? DUCK_H : STAND_H
  const hw = PLAYER_W / 2

  // Body
  ctx.fillStyle = '#00f5ff'
  ctx.beginPath()
  ctx.roundRect(PLAYER_X - hw, y, PLAYER_W, h, 4)
  ctx.fill()

  if (!p.ducking) {
    // Head
    ctx.fillStyle = '#00f5ff'
    ctx.beginPath()
    ctx.arc(PLAYER_X, y - 8, 9, 0, Math.PI * 2)
    ctx.fill()
    // Visor
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.arc(PLAYER_X + 2, y - 8, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Legs (animated)
  if (p.onGround && !p.ducking) {
    const legPhase = Date.now() * 0.015
    ctx.fillStyle = '#00d4dd'
    ctx.fillRect(PLAYER_X - hw,     y + h - 8, 8, 8 + Math.sin(legPhase) * 3)
    ctx.fillRect(PLAYER_X - hw + 12, y + h - 8, 8, 8 - Math.sin(legPhase) * 3)
  }
  ctx.restore()
}

// Obstacle shapes
function drawObstacle(ctx, ob) {
  ctx.save()
  ctx.shadowColor = ob.color
  ctx.shadowBlur  = 8
  ctx.fillStyle   = ob.color

  if (ob.type === 'cactus') {
    // Ground cactus
    ctx.fillRect(ob.x + ob.w * 0.35, ob.y, ob.w * 0.3, ob.h)       // trunk
    ctx.fillRect(ob.x, ob.y + ob.h * 0.35, ob.w, ob.h * 0.2)       // arms
    ctx.fillRect(ob.x, ob.y + ob.h * 0.15, ob.w * 0.25, ob.h * 0.4)
    ctx.fillRect(ob.x + ob.w * 0.75, ob.y + ob.h * 0.15, ob.w * 0.25, ob.h * 0.4)
  } else if (ob.type === 'barrier') {
    // Tall wall — must jump
    ctx.fillRect(ob.x, ob.y, ob.w, ob.h)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(ob.x + 2, ob.y + 2, ob.w - 4, ob.h - 4)
  } else if (ob.type === 'drone') {
    // Flying drone — must duck
    ctx.beginPath()
    ctx.ellipse(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2, ob.h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    // Rotors
    ctx.fillRect(ob.x - 8,          ob.y,          8, 3)
    ctx.fillRect(ob.x + ob.w,       ob.y,          8, 3)
    ctx.fillRect(ob.x - 8,          ob.y + ob.h - 3, 8, 3)
    ctx.fillRect(ob.x + ob.w,       ob.y + ob.h - 3, 8, 3)
  }
  ctx.restore()
}

function drawBg(ctx, bgOffset, speed) {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#04040f')
  grad.addColorStop(1, '#0a0a20')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  for (let i = 0; i < 50; i++) {
    const sx = ((i * 87 + bgOffset * 0.1) % W)
    const sy = (i * 53) % (GROUND_Y - 40)
    ctx.fillRect(sx, sy, 1.5, 1.5)
  }

  // Ground line
  ctx.save()
  ctx.strokeStyle = '#00f5ff'
  ctx.lineWidth   = 1.5
  ctx.shadowColor = '#00f5ff'
  ctx.shadowBlur  = 6
  ctx.beginPath()
  ctx.moveTo(0, GROUND_Y + STAND_H)
  ctx.lineTo(W, GROUND_Y + STAND_H)
  ctx.stroke()
  ctx.restore()

  // Scrolling ground grid lines
  ctx.save()
  ctx.strokeStyle = 'rgba(0,245,255,0.08)'
  ctx.lineWidth   = 1
  const gridSpacing = 40
  const offsetX     = bgOffset % gridSpacing
  for (let x = -offsetX; x < W; x += gridSpacing) {
    ctx.beginPath()
    ctx.moveTo(x, GROUND_Y + STAND_H)
    ctx.lineTo(x + 20, H)
    ctx.stroke()
  }
  ctx.restore()

  // Buildings in bg
  ctx.save()
  ctx.fillStyle = 'rgba(0,245,255,0.04)'
  for (let i = 0; i < 6; i++) {
    const bx = ((i * 120 + bgOffset * 0.3) % (W + 80)) - 40
    const bh = 60 + (i * 33) % 80
    ctx.fillRect(bx, GROUND_Y + STAND_H - bh, 50, bh)
  }
  ctx.restore()
}

const RUNNER_DIFF = {
  easy:   { baseSpeed: 3.2, maxSpeed:  8, spawnMin: 75,  spawnMax: 130 },
  medium: { baseSpeed: 4.5, maxSpeed: 11, spawnMin: 55,  spawnMax: 110 },
  hard:   { baseSpeed: 5.8, maxSpeed: 14, spawnMin: 38,  spawnMax:  85 },
}

export default function RunnerGame({ difficulty = 'medium' }) {
  const dcfg = RUNNER_DIFF[difficulty] ?? RUNNER_DIFF.medium
  const { updateScore } = useUser()
  const navigate        = useNavigate()
  const canvasRef       = useRef(null)
  const stateRef        = useRef(null)
  const rafRef          = useRef(null)
  const lastTimeRef     = useRef(null)

  const [phase,    setPhase]    = useState('playing')
  const [score,    setScore]    = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)

  const scoreRef   = useRef(0)
  const timeRef    = useRef(60)
  const lastTick   = useRef(Date.now())

  const spawnObstacle = useCallback((speed) => {
    const r = Math.random()
    // Drone (fly obstacle — duck to avoid) or ground obstacle (jump to avoid)
    if (r < 0.28 && speed > 6) {
      // Drone — flies at mid height
      const droneY = GROUND_Y - 40 + rand(-10, 10)
      stateRef.current.obstacles.push({
        x: W + 10, y: droneY, w: 32, h: 20,
        type: 'drone', color: '#bf00ff',
      })
    } else if (r < 0.55) {
      // Cactus — ground
      const h = rand(35, 55)
      stateRef.current.obstacles.push({
        x: W + 10, y: GROUND_Y + STAND_H - h, w: 26, h,
        type: 'cactus', color: '#ff006e',
      })
    } else {
      // Barrier — tall wall
      const h = rand(40, 60)
      stateRef.current.obstacles.push({
        x: W + 10, y: GROUND_Y + STAND_H - h, w: 18, h,
        type: 'barrier', color: '#ffd700',
      })
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    stateRef.current = {
      player:    { y: GROUND_Y, vy: 0, onGround: true, ducking: false, jumpsLeft: 2 },
      obstacles: [],
      bgOffset:  0,
      spawnTimer: 0,
      alive: true,
    }

    const jump = () => {
      const p = stateRef.current?.player
      if (!p || !stateRef.current.alive) return
      if (p.jumpsLeft > 0) {
        p.vy = JUMP_VEL
        p.onGround = false
        p.jumpsLeft--
      }
    }
    const duck = (down) => {
      const p = stateRef.current?.player
      if (!p) return
      p.ducking = down
    }

    const onKey = (e) => {
      if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === ' ') jump()
      if (e.key === 'ArrowDown' || e.key === 's') duck(true)
    }
    const onKeyUp = (e) => {
      if (e.key === 'ArrowDown' || e.key === 's') duck(false)
    }
    const onTouch = (e) => {
      const t     = e.changedTouches[0]
      const midY  = canvas.getBoundingClientRect().height / 2
      if (t.clientY < midY) jump()   // tap top half → jump
      else duck(true)                 // tap bottom half → duck
    }
    const onTouchEnd = () => duck(false)

    window.addEventListener('keydown',  onKey)
    window.addEventListener('keyup',    onKeyUp)
    canvas.addEventListener('touchstart', onTouch,   { passive: true })
    canvas.addEventListener('touchend',   onTouchEnd, { passive: true })

    const loop = (ts) => {
      if (!stateRef.current) return
      const s   = stateRef.current
      const now = Date.now()

      // Timer
      if (now - lastTick.current >= 1000) {
        lastTick.current = now
        timeRef.current  = Math.max(0, timeRef.current - 1)
        setTimeLeft(timeRef.current)
        if (timeRef.current <= 0) { endGame(); return }
      }

      const elapsed  = (ts / 1000)
      const speed    = Math.min(dcfg.maxSpeed, dcfg.baseSpeed + elapsed * 0.12)
      lastTimeRef.current = ts

      // Score = distance
      scoreRef.current = Math.floor(elapsed * speed * 3)
      setScore(scoreRef.current)

      // Player physics
      const p = s.player
      if (!p.ducking || !p.onGround) {
        p.vy += GRAVITY
        p.y  += p.vy
      }
      const groundY = GROUND_Y
      if (p.y >= groundY) {
        p.y        = groundY
        p.vy       = 0
        p.onGround = true
        p.jumpsLeft = 2
      }

      // Spawn obstacles
      const spawnGap = Math.max(dcfg.spawnMin, dcfg.spawnMax - elapsed * 1.2)
      s.spawnTimer++
      if (s.spawnTimer >= spawnGap) {
        s.spawnTimer = 0
        spawnObstacle(speed)
      }

      // Move obstacles + collision
      s.bgOffset += speed
      s.obstacles = s.obstacles.filter(ob => {
        ob.x -= speed
        if (ob.x + ob.w < 0) return false

        // Collision
        const ph = p.ducking ? DUCK_H : STAND_H
        const py = p.ducking ? p.y + STAND_H - DUCK_H : p.y
        const px = PLAYER_X - PLAYER_W / 2

        const hit = px < ob.x + ob.w - 3 &&
                    px + PLAYER_W > ob.x + 3 &&
                    py < ob.y + ob.h - 3 &&
                    py + ph > ob.y + 3

        if (hit) { endGame(); return false }
        return true
      })

      // Draw
      drawBg(ctx, s.bgOffset, speed)
      s.obstacles.forEach(ob => drawObstacle(ctx, ob))
      drawPlayer(ctx, p)

      // Speed indicator
      ctx.save()
      ctx.fillStyle   = 'rgba(0,245,255,0.4)'
      ctx.font        = 'bold 9px "Orbitron", sans-serif'
      ctx.letterSpacing = '2px'
      ctx.fillText(`SPEED ×${speed.toFixed(1)}`, W - 90, H - 12)
      ctx.restore()

      rafRef.current = requestAnimationFrame(loop)
    }

    lastTick.current = Date.now()
    rafRef.current   = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      stateRef.current = null
      window.removeEventListener('keydown',  onKey)
      window.removeEventListener('keyup',    onKeyUp)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  }, []) // eslint-disable-line

  const endGame = useCallback(() => {
    if (stateRef.current) stateRef.current.alive = false
    cancelAnimationFrame(rafRef.current)
    stateRef.current = null
    updateScore('runner', scoreRef.current)
    setPhase('result')
  }, [updateScore])

  if (phase === 'result') {
    return (
      <ResultScreen
        game="NEON RUNNER"
        score={scoreRef.current}
        color="green"
        stats={[
          { label: 'DISTANCE', value: `${scoreRef.current}m` },
          { label: 'SURVIVED', value: `${60 - timeRef.current}s` },
        ]}
        onPlayAgain={() => window.location.reload()}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen" style={{ background: '#080818' }}>

      {/* HUD */}
      <div className="w-full flex items-center justify-between px-4 py-2" style={{ maxWidth: W }}>
        <span className="font-orbitron text-sm font-black" style={{ color: '#00ff88' }}>
          {score}m
        </span>
        <span className="font-orbitron text-xs font-black"
          style={{ color: timeLeft <= 10 ? '#ff006e' : '#9ca3af' }}>
          {timeLeft}s
        </span>
      </div>

      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: '100%', maxWidth: W, height: 'auto', display: 'block', touchAction: 'none' }} />

      {/* On-screen controls */}
      <div className="w-full flex justify-between px-6 mt-3" style={{ maxWidth: W }}>
        <button
          onTouchStart={e => { e.preventDefault(); const p = stateRef.current?.player; if (p && p.jumpsLeft > 0) { p.vy = JUMP_VEL; p.onGround = false; p.jumpsLeft-- } }}
          className="font-orbitron text-[10px] tracking-widest px-5 py-3 rounded-2xl"
          style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', touchAction: 'none' }}>
          ▲ JUMP
        </button>
        <button
          onTouchStart={e => { e.preventDefault(); const p = stateRef.current?.player; if (p) p.ducking = true }}
          onTouchEnd={e => { e.preventDefault(); const p = stateRef.current?.player; if (p) p.ducking = false }}
          className="font-orbitron text-[10px] tracking-widest px-5 py-3 rounded-2xl"
          style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700', touchAction: 'none' }}>
          ▼ DUCK
        </button>
      </div>
      <p className="font-orbitron text-[9px] text-gray-700 tracking-widest mt-2">
        TAP TOP HALF TO JUMP · DOUBLE JUMP ALLOWED
      </p>
    </div>
  )
}
