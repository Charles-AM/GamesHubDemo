import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const GAME_DURATION = 60
const CANVAS_W      = 390
const CANVAS_H      = 600
const PLAYER_W      = 36
const PLAYER_H      = 36
const BULLET_W      = 4
const BULLET_H      = 14
const BULLET_SPEED  = 11
const PLAYER_SPEED  = 5

// Enemy configs per wave tier
const ENEMY_TIERS = [
  { w: 28, h: 22, hp: 1, pts: 10, color: '#ff006e', speed: 1.4 },  // basic
  { w: 24, h: 20, hp: 1, pts: 15, color: '#bf00ff', speed: 2.2 },  // fast
  { w: 34, h: 28, hp: 2, pts: 25, color: '#ffd700', speed: 1.0 },  // tank
]

function rand(min, max) { return Math.random() * (max - min) + min }

function drawShip(ctx, x, y, w, h) {
  ctx.save()
  ctx.translate(x, y)
  // Body
  ctx.fillStyle = '#00f5ff'
  ctx.shadowColor = '#00f5ff'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w, h)
  ctx.lineTo(w * 0.7, h * 0.8)
  ctx.lineTo(w / 2, h * 0.95)
  ctx.lineTo(w * 0.3, h * 0.8)
  ctx.lineTo(0, h)
  ctx.closePath()
  ctx.fill()
  // Cockpit
  ctx.fillStyle = 'rgba(0,245,255,0.4)'
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.ellipse(w / 2, h * 0.4, w * 0.18, h * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawEnemy(ctx, e) {
  ctx.save()
  ctx.translate(e.x, e.y)
  ctx.shadowColor = e.color
  ctx.shadowBlur  = 10
  ctx.fillStyle   = e.color

  if (e.tier === 0) {
    // Saucer
    ctx.beginPath()
    ctx.ellipse(e.w / 2, e.h / 2, e.w / 2, e.h * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.ellipse(e.w / 2, e.h * 0.4, e.w * 0.25, e.h * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (e.tier === 1) {
    // Arrow fighter
    ctx.beginPath()
    ctx.moveTo(e.w / 2, e.h)
    ctx.lineTo(0, 0)
    ctx.lineTo(e.w * 0.3, e.h * 0.4)
    ctx.lineTo(e.w / 2, e.h * 0.2)
    ctx.lineTo(e.w * 0.7, e.h * 0.4)
    ctx.lineTo(e.w, 0)
    ctx.closePath()
    ctx.fill()
  } else {
    // Tank — blocky with cannons
    ctx.fillRect(e.w * 0.1, 0, e.w * 0.8, e.h)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(e.w * 0.2, e.h * 0.1, e.w * 0.6, e.h * 0.8)
    // HP indicator
    ctx.fillStyle = '#ffd700'
    ctx.shadowBlur = 6
    ctx.fillRect(e.w * 0.2, e.h - 5, (e.hp / 2) * e.w * 0.6, 3)
  }
  ctx.restore()
}

function drawParticle(ctx, p) {
  ctx.save()
  ctx.globalAlpha = p.life / p.maxLife
  ctx.fillStyle   = p.color
  ctx.shadowColor = p.color
  ctx.shadowBlur  = 6
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export default function ShooterGame({ onFinish }) {
  const { updateScore } = useUser()
  const navigate        = useNavigate()
  const canvasRef       = useRef(null)
  const stateRef        = useRef(null)
  const rafRef          = useRef(null)
  const lastTimeRef     = useRef(null)
  const touchYRef       = useRef(null)

  const [phase,  setPhase]  = useState('playing')
  const [score,  setScore]  = useState(0)
  const [lives,  setLives]  = useState(3)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)

  const scoreRef  = useRef(0)
  const livesRef  = useRef(3)
  const timeRef   = useRef(GAME_DURATION)

  // Init game state
  const initState = useCallback(() => ({
    player: { x: CANVAS_W / 2 - PLAYER_W / 2, y: CANVAS_H - PLAYER_H - 20 },
    bullets:   [],
    enemies:   [],
    particles: [],
    keys:      { left: false, right: false, fire: false },
    autoFire:  0,
    spawnTimer: 0,
    spawnRate:  120,   // frames between spawns (decreases over time)
    waveTimer:  0,
    elapsed:    0,
  }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext('2d')
    stateRef.current = initState()

    let lastShot  = 0
    let lastTick  = 0

    // Keyboard
    const onKey = (e, down) => {
      const s = stateRef.current
      if (!s) return
      if (e.key === 'ArrowLeft'  || e.key === 'a') s.keys.left  = down
      if (e.key === 'ArrowRight' || e.key === 'd') s.keys.right = down
      if (e.key === ' ' || e.key === 'ArrowUp')    s.keys.fire  = down
    }
    window.addEventListener('keydown', e => onKey(e, true))
    window.addEventListener('keyup',   e => onKey(e, false))

    // Touch: drag to move, auto-fire
    const onTouchStart = e => {
      const t = e.touches[0]
      touchYRef.current = t.clientY
    }
    const onTouchMove  = e => {
      e.preventDefault()
      const s   = stateRef.current
      const t   = e.touches[0]
      const dx  = t.clientX - (canvas.getBoundingClientRect().left + CANVAS_W / 2)
      s.player.x = Math.max(0, Math.min(CANVAS_W - PLAYER_W, CANVAS_W / 2 - PLAYER_W / 2 + dx))
    }
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })

    const spawnEnemy = (elapsed) => {
      const s = stateRef.current
      // More tank enemies later in the game
      let tier = 0
      const prog = elapsed / GAME_DURATION
      const r    = Math.random()
      if (prog > 0.6 && r < 0.25)      tier = 2
      else if (prog > 0.3 && r < 0.45) tier = 1
      const cfg = ENEMY_TIERS[tier]

      // Sine-wave or straight path
      const sine  = tier === 1 && Math.random() > 0.5
      const startX = rand(10, CANVAS_W - cfg.w - 10)

      s.enemies.push({
        x: startX, y: -cfg.h,
        w: cfg.w, h: cfg.h,
        hp: cfg.hp, maxHp: cfg.hp,
        pts: cfg.pts, color: cfg.color,
        speed: cfg.speed + prog * 0.8,
        tier,
        sine, sinePhase: rand(0, Math.PI * 2), originX: startX,
      })
    }

    const explode = (x, y, color, count = 8) => {
      const s = stateRef.current
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + rand(-0.3, 0.3)
        const speed = rand(1.5, 4)
        s.particles.push({
          x: x + rand(-8, 8), y: y + rand(-8, 8),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: rand(2, 5), color,
          life: 30, maxLife: 30,
        })
      }
    }

    const loop = (ts) => {
      if (!stateRef.current) return
      const s   = stateRef.current
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      // Delta time (capped)
      const dt = Math.min((ts - (lastTimeRef.current || ts)) / 16.67, 3)
      lastTimeRef.current = ts

      // Timer tick (real seconds)
      const now = Date.now()
      if (now - lastTick >= 1000) {
        lastTick = now
        timeRef.current = Math.max(0, timeRef.current - 1)
        setTimeLeft(timeRef.current)
        if (timeRef.current <= 0) {
          endGame()
          return
        }
      }

      s.elapsed += dt / 60  // seconds elapsed

      // ── Move player ──────────────────────────────
      if (s.keys.left)  s.player.x = Math.max(0, s.player.x - PLAYER_SPEED)
      if (s.keys.right) s.player.x = Math.min(CANVAS_W - PLAYER_W, s.player.x + PLAYER_SPEED)

      // Auto-fire (touch) or key fire
      s.autoFire++
      if (s.autoFire >= 12) { // fire ~5× per second
        s.autoFire = 0
        s.bullets.push({
          x: s.player.x + PLAYER_W / 2 - BULLET_W / 2,
          y: s.player.y - BULLET_H,
        })
      }

      // ── Move bullets ─────────────────────────────
      s.bullets = s.bullets
        .map(b => ({ ...b, y: b.y - BULLET_SPEED }))
        .filter(b => b.y > -BULLET_H)

      // ── Spawn enemies ─────────────────────────────
      s.spawnTimer++
      const rate = Math.max(45, 120 - s.elapsed * 10)
      if (s.spawnTimer >= rate) {
        s.spawnTimer = 0
        spawnEnemy(s.elapsed)
      }

      // ── Move enemies ──────────────────────────────
      s.enemies = s.enemies.filter(e => {
        e.y += e.speed
        if (e.sine) {
          e.sinePhase += 0.06
          e.x = e.originX + Math.sin(e.sinePhase) * 55
        }
        // Enemy left screen bottom → lose a life
        if (e.y > CANVAS_H + e.h) {
          livesRef.current = Math.max(0, livesRef.current - 1)
          setLives(livesRef.current)
          if (livesRef.current <= 0) { endGame(); return false }
          return false
        }
        return true
      })

      // ── Bullet ↔ Enemy collisions ─────────────────
      const deadBullets = new Set()
      s.enemies = s.enemies.filter(e => {
        for (let bi = 0; bi < s.bullets.length; bi++) {
          if (deadBullets.has(bi)) continue
          const b = s.bullets[bi]
          if (b.x < e.x + e.w && b.x + BULLET_W > e.x &&
              b.y < e.y + e.h && b.y + BULLET_H > e.y) {
            deadBullets.add(bi)
            e.hp--
            if (e.hp <= 0) {
              explode(e.x + e.w / 2, e.y + e.h / 2, e.color, 10)
              scoreRef.current += e.pts
              setScore(scoreRef.current)
              return false
            }
          }
        }
        return true
      })
      s.bullets = s.bullets.filter((_, i) => !deadBullets.has(i))

      // ── Particles ─────────────────────────────────
      s.particles = s.particles
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1, vx: p.vx * 0.92, vy: p.vy * 0.92 }))
        .filter(p => p.life > 0)

      // ── Draw ──────────────────────────────────────
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      // Stars background
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 97 + ts * 0.01) % CANVAS_W)
        const sy = ((i * 137 + ts * 0.02 * (1 + i % 3)) % CANVAS_H)
        ctx.fillRect(sx, sy, 1.5, 1.5)
      }

      // Bullets
      s.bullets.forEach(b => {
        ctx.save()
        ctx.fillStyle   = '#00f5ff'
        ctx.shadowColor = '#00f5ff'
        ctx.shadowBlur  = 8
        ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H)
        ctx.restore()
      })

      // Enemies
      s.enemies.forEach(e => drawEnemy(ctx, e))

      // Player
      drawShip(ctx, s.player.x, s.player.y, PLAYER_W, PLAYER_H)

      // Particles
      s.particles.forEach(p => drawParticle(ctx, p))

      rafRef.current = requestAnimationFrame(loop)
    }

    lastTick = Date.now()
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', e => onKey(e, true))
      window.removeEventListener('keyup',   e => onKey(e, false))
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      stateRef.current = null
    }
  }, []) // eslint-disable-line

  const endGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    stateRef.current = null
    updateScore('shooter', scoreRef.current)
    if (onFinish) onFinish(scoreRef.current)
    setPhase('result')
  }, [updateScore, onFinish])

  // Touch: move ship by dragging
  const handleCanvasMove = useCallback((e) => {
    e.preventDefault()
    const s = stateRef.current
    if (!s) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const newX = (clientX - rect.left) * scaleX - PLAYER_W / 2
    s.player.x = Math.max(0, Math.min(CANVAS_W - PLAYER_W, newX))
  }, [])

  if (phase === 'result') {
    return (
      <ResultScreen
        game="SPACE SHOOTER"
        score={scoreRef.current}
        color="cyan"
        stats={[
          { label: 'SURVIVED', value: `${GAME_DURATION - timeRef.current}s` },
          { label: 'LIVES',    value: `${livesRef.current}/3` },
        ]}
        onPlayAgain={() => window.location.reload()}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen" style={{ background: '#080818' }}>

      {/* HUD */}
      <div className="w-full flex items-center justify-between px-4 py-2"
        style={{ maxWidth: CANVAS_W }}>
        {/* Lives */}
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <span key={i} style={{ fontSize: 18, opacity: i < lives ? 1 : 0.15 }}>🚀</span>
          ))}
        </div>
        {/* Timer */}
        <span className="font-orbitron text-sm font-black"
          style={{ color: timeLeft <= 10 ? '#ff006e' : '#00f5ff' }}>
          {timeLeft}s
        </span>
        {/* Score */}
        <span className="font-orbitron text-sm font-black" style={{ color: '#ffd700' }}>
          {score}
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onTouchMove={handleCanvasMove}
        style={{
          width: '100%',
          maxWidth: CANVAS_W,
          height: 'auto',
          display: 'block',
          touchAction: 'none',
          cursor: 'none',
        }}
      />

      {/* Mobile controls hint */}
      <p className="font-orbitron text-[9px] text-gray-700 tracking-widest mt-2">
        DRAG TO MOVE · AUTO-FIRE ON
      </p>
    </div>
  )
}
