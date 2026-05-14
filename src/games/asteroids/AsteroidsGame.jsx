import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const W = 390
const H = 580
const THRUST       = 0.15
const MAX_SPEED    = 7
const FRICTION     = 0.985
const TURN_SPEED   = 3.2 * (Math.PI / 180)
const BULLET_SPEED = 9
const BULLET_LIFE  = 95
const MAX_BULLETS  = 5
const INVINCIBLE_FRAMES = 120
const GAME_DURATION = 90

const DIFF = {
  easy:   { lives: 4, initRocks: 3, speedMult: 0.65, autoFire: true,  fireRate: 40 },
  medium: { lives: 3, initRocks: 4, speedMult: 1.0,  autoFire: false, fireRate: 25 },
  hard:   { lives: 2, initRocks: 6, speedMult: 1.4,  autoFire: false, fireRate: 20 },
}

const ROCK_SIZES = {
  large:  { r: 40, pts: 20,  next: 'medium' },
  medium: { r: 22, pts: 50,  next: 'small'  },
  small:  { r: 12, pts: 100, next: null      },
}

const ROCK_COLORS = { large: '#ff006e', medium: '#ffd700', small: '#00ff88' }

function makeStars() {
  return Array.from({ length: 100 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.2 + 0.3,
    a: Math.random() * 0.4 + 0.3,
  }))
}

function makeRockShape(r) {
  const verts = 9
  return Array.from({ length: verts }, (_, i) => {
    const angle = (i / verts) * Math.PI * 2
    const dist  = r * (0.7 + Math.random() * 0.6)
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
  })
}

function spawnRock(size, cfg, avoidX = W / 2, avoidY = H / 2) {
  const info = ROCK_SIZES[size]
  let x, y
  do {
    x = Math.random() * W
    y = Math.random() * H
  } while (Math.hypot(x - avoidX, y - avoidY) < 120)

  const angle = Math.random() * Math.PI * 2
  const speed = (0.8 + Math.random() * 0.8) * cfg.speedMult
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: 0,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    size,
    r: info.r,
    pts: info.pts,
    shape: makeRockShape(info.r),
  }
}

function initState(cfg) {
  const ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, alive: true }
  const asteroids = Array.from({ length: cfg.initRocks }, () => spawnRock('large', cfg, W / 2, H / 2))
  return {
    ship,
    bullets: [],
    asteroids,
    score: 0,
    lives: cfg.lives,
    wave: 1,
    timeLeft: GAME_DURATION,
    invincible: INVINCIBLE_FRAMES,
    fireCooldown: 0,
    gameOver: false,
    elapsed: 0,
  }
}

export default function AsteroidsGame({ difficulty = 'medium' }) {
  const navigate  = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef  = useRef(null)
  const stateRef   = useRef(initState(cfg))
  const keysRef    = useRef({ left: false, right: false, thrust: false, fire: false })
  const starsRef   = useRef(makeStars())
  const rafRef     = useRef(null)
  const lastTimeRef= useRef(null)

  const [phase, setPhase]       = useState('playing') // 'playing' | 'done'
  const [finalScore, setFinalScore] = useState(0)
  const [finalWave,  setFinalWave]  = useState(1)
  const [finalTime,  setFinalTime]  = useState(0)

  const drawFrame = useCallback((ctx, st) => {
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#080818'
    ctx.fillRect(0, 0, W, H)

    // Stars
    starsRef.current.forEach(s => {
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${s.a})`
      ctx.fill()
    })

    // Asteroids
    st.asteroids.forEach(rock => {
      ctx.save()
      ctx.translate(rock.x, rock.y)
      ctx.rotate(rock.rot)
      ctx.beginPath()
      rock.shape.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y))
      ctx.closePath()
      ctx.strokeStyle = ROCK_COLORS[rock.size]
      ctx.lineWidth   = 1.5
      ctx.shadowColor = ROCK_COLORS[rock.size]
      ctx.shadowBlur  = 6
      ctx.stroke()
      ctx.restore()
    })

    // Bullets
    st.bullets.forEach(b => {
      ctx.beginPath()
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle   = '#00f5ff'
      ctx.shadowColor = '#00f5ff'
      ctx.shadowBlur  = 8
      ctx.fill()
    })

    // Ship
    if (st.ship.alive && (st.invincible <= 0 || Math.floor(st.invincible / 10) % 2 === 0)) {
      const { x, y, angle } = st.ship
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle + Math.PI / 2)
      ctx.beginPath()
      ctx.moveTo(0, -13)
      ctx.lineTo(9, 10)
      ctx.lineTo(-9, 10)
      ctx.closePath()
      ctx.strokeStyle = '#00f5ff'
      ctx.lineWidth   = 1.5
      ctx.shadowColor = '#00f5ff'
      ctx.shadowBlur  = 10
      ctx.stroke()

      // Exhaust flame when thrusting
      if (keysRef.current.thrust) {
        ctx.beginPath()
        ctx.moveTo(-5, 10)
        ctx.lineTo(0, 18 + Math.random() * 6)
        ctx.lineTo(5, 10)
        ctx.strokeStyle = '#ff6600'
        ctx.lineWidth   = 1.5
        ctx.shadowColor = '#ff6600'
        ctx.shadowBlur  = 12
        ctx.stroke()
      }
      ctx.restore()
    }

    // HUD
    ctx.shadowBlur = 0
    ctx.fillStyle  = '#00f5ff'
    ctx.font       = 'bold 13px monospace'
    ctx.textAlign  = 'left'
    ctx.fillText(`SCORE: ${st.score.toLocaleString()}`, 12, 22)

    ctx.textAlign  = 'right'
    ctx.fillText(`WAVE ${st.wave}`, W - 12, 22)

    // Lives (triangle icons top-center)
    const livesToDraw = Math.max(0, st.lives)
    for (let i = 0; i < livesToDraw; i++) {
      const lx = W / 2 - (livesToDraw - 1) * 13 + i * 26
      ctx.save()
      ctx.translate(lx, 16)
      ctx.beginPath()
      ctx.moveTo(0, -8)
      ctx.lineTo(6, 5)
      ctx.lineTo(-6, 5)
      ctx.closePath()
      ctx.strokeStyle = '#00f5ff'
      ctx.lineWidth   = 1.2
      ctx.stroke()
      ctx.restore()
    }

    // Timer bar
    const timerRatio = Math.max(0, st.timeLeft / GAME_DURATION)
    ctx.fillStyle = 'rgba(0,245,255,0.15)'
    ctx.fillRect(0, H - 5, W, 5)
    ctx.fillStyle = '#00f5ff'
    ctx.fillRect(0, H - 5, W * timerRatio, 5)
  }, [])

  const resetGame = useCallback(() => {
    stateRef.current = initState(cfg)
    lastTimeRef.current = null
    setPhase('playing')
  }, [cfg])

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function tick(timestamp) {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const dt = Math.min((timestamp - lastTimeRef.current) / 16.67, 3) // normalize to 60fps
      lastTimeRef.current = timestamp

      const st  = stateRef.current
      const keys = keysRef.current

      // Rotation
      if (keys.left)  st.ship.angle -= TURN_SPEED * dt
      if (keys.right) st.ship.angle += TURN_SPEED * dt

      // Thrust
      if (keys.thrust && st.ship.alive) {
        st.ship.vx += Math.cos(st.ship.angle) * THRUST * dt
        st.ship.vy += Math.sin(st.ship.angle) * THRUST * dt
        const speed = Math.hypot(st.ship.vx, st.ship.vy)
        if (speed > MAX_SPEED) {
          st.ship.vx = (st.ship.vx / speed) * MAX_SPEED
          st.ship.vy = (st.ship.vy / speed) * MAX_SPEED
        }
      }

      // Friction
      st.ship.vx *= Math.pow(FRICTION, dt)
      st.ship.vy *= Math.pow(FRICTION, dt)

      // Move ship
      if (st.ship.alive) {
        st.ship.x = (st.ship.x + st.ship.vx * dt + W) % W
        st.ship.y = (st.ship.y + st.ship.vy * dt + H) % H
      }

      // Invincibility countdown
      if (st.invincible > 0) st.invincible -= dt

      // Fire cooldown
      if (st.fireCooldown > 0) st.fireCooldown -= dt

      // Firing
      const shouldFire = keys.fire && (cfg.autoFire || keys.fire)
      if (shouldFire && st.fireCooldown <= 0 && st.ship.alive && st.bullets.length < MAX_BULLETS) {
        st.bullets.push({
          x: st.ship.x + Math.cos(st.ship.angle) * 14,
          y: st.ship.y + Math.sin(st.ship.angle) * 14,
          vx: st.ship.vx + Math.cos(st.ship.angle) * BULLET_SPEED,
          vy: st.ship.vy + Math.sin(st.ship.angle) * BULLET_SPEED,
          life: BULLET_LIFE,
        })
        st.fireCooldown = cfg.fireRate
      }

      // Move bullets
      st.bullets = st.bullets
        .map(b => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt, life: b.life - dt }))
        .filter(b => b.life > 0 && b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10)

      // Move asteroids
      st.asteroids.forEach(rock => {
        rock.x = (rock.x + rock.vx * dt + W) % W
        rock.y = (rock.y + rock.vy * dt + H) % H
        rock.rot += rock.rotSpeed * dt
      })

      // Bullet-asteroid collisions
      const newRocks = []
      const hitBullets = new Set()
      st.asteroids = st.asteroids.filter((rock, ri) => {
        for (let bi = 0; bi < st.bullets.length; bi++) {
          if (hitBullets.has(bi)) continue
          const b = st.bullets[bi]
          if (Math.hypot(b.x - rock.x, b.y - rock.y) < rock.r) {
            hitBullets.add(bi)
            st.score += rock.pts
            const info = ROCK_SIZES[rock.size]
            if (info.next) {
              for (let s = 0; s < 2; s++) {
                const spreadAngle = Math.atan2(rock.vy, rock.vx) + (s === 0 ? 1 : -1) * Math.PI / 4
                const speed = Math.hypot(rock.vx, rock.vy) * 1.2
                const nr = spawnRock(info.next, cfg, -999, -999)
                nr.x  = rock.x
                nr.y  = rock.y
                nr.vx = Math.cos(spreadAngle) * speed
                nr.vy = Math.sin(spreadAngle) * speed
                newRocks.push(nr)
              }
            }
            return false
          }
        }
        return true
      })
      st.bullets = st.bullets.filter((_, i) => !hitBullets.has(i))
      st.asteroids.push(...newRocks)

      // Ship-asteroid collision
      if (st.ship.alive && st.invincible <= 0) {
        for (const rock of st.asteroids) {
          if (Math.hypot(st.ship.x - rock.x, st.ship.y - rock.y) < rock.r + 8) {
            st.lives -= 1
            if (st.lives <= 0) {
              st.gameOver = true
            } else {
              st.ship.x  = W / 2
              st.ship.y  = H / 2
              st.ship.vx = 0
              st.ship.vy = 0
              st.invincible = INVINCIBLE_FRAMES
            }
            break
          }
        }
      }

      // New wave
      if (st.asteroids.length === 0 && !st.gameOver) {
        st.wave += 1
        const count = cfg.initRocks + st.wave - 1
        for (let i = 0; i < count; i++) {
          st.asteroids.push(spawnRock('large', cfg, st.ship.x, st.ship.y))
        }
      }

      // Timer
      st.timeLeft -= dt * (1 / 60)
      st.elapsed  += dt * (1 / 60)

      if (st.timeLeft <= 0 || st.gameOver) {
        const score = st.score
        const wave  = st.wave
        const time  = Math.round(st.elapsed)
        recordGame?.({ game: 'asteroids', score, mode: 'solo', won: score > 0 })
        setFinalScore(score)
        setFinalWave(wave)
        setFinalTime(time)
        setPhase('done')
        return
      }

      drawFrame(ctx, st)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, cfg, drawFrame, recordGame])

  // Button handlers
  const btn = (key, val) => (e) => {
    e.preventDefault()
    keysRef.current[key] = val
  }

  if (phase === 'done') {
    return (
      <ResultScreen
        game="ASTEROID BLASTER"
        score={finalScore}
        color="cyan"
        stats={[
          { label: 'WAVE',  value: finalWave },
          { label: 'TIME',  value: `${finalTime}s` },
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
        style={{ display: 'block', maxWidth: '100%', touchAction: 'none' }}
      />

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: 12,
        padding: '16px 0 24px',
        justifyContent: 'center',
        width: '100%',
      }}>
        {/* Rotate left */}
        <button
          onPointerDown={btn('left', true)}
          onPointerUp={btn('left', false)}
          onPointerLeave={btn('left', false)}
          style={ctrlStyle}
        >
          ◄
        </button>

        {/* Thrust */}
        <button
          onPointerDown={btn('thrust', true)}
          onPointerUp={btn('thrust', false)}
          onPointerLeave={btn('thrust', false)}
          style={ctrlStyle}
        >
          ▲
        </button>

        {/* Fire */}
        <button
          onPointerDown={btn('fire', true)}
          onPointerUp={btn('fire', false)}
          onPointerLeave={btn('fire', false)}
          style={{ ...ctrlStyle, background: 'rgba(0,245,255,0.12)', borderColor: 'rgba(0,245,255,0.5)', color: '#00f5ff' }}
        >
          ●
        </button>

        {/* Rotate right */}
        <button
          onPointerDown={btn('right', true)}
          onPointerUp={btn('right', false)}
          onPointerLeave={btn('right', false)}
          style={ctrlStyle}
        >
          ►
        </button>
      </div>
    </div>
  )
}

const ctrlStyle = {
  width: 72,
  height: 56,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#aaa',
  fontSize: 20,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
}
