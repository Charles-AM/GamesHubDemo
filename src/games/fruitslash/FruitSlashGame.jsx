import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const W = 390
const H = 580
const GAME_DURATION = 60
const MAX_LIVES = 3

const FRUITS = [
  { emoji: '🍉', color: '#ff4d6d', pts: 10, r: 28 },
  { emoji: '🍊', color: '#ff9500', pts: 10, r: 24 },
  { emoji: '🍋', color: '#ffd700', pts: 10, r: 22 },
  { emoji: '🍇', color: '#bf00ff', pts: 15, r: 22 },
  { emoji: '🍓', color: '#ff006e', pts: 15, r: 20 },
  { emoji: '🍑', color: '#ffb347', pts: 10, r: 24 },
  { emoji: '🥝', color: '#00ff88', pts: 20, r: 20 },
  { emoji: '🍍', color: '#ffd700', pts: 20, r: 26 },
]

const BOMB = { emoji: '💣', color: '#ff006e', r: 22 }

const SLASH_DIFF = {
  easy:   { lives: 4, bombChance: 0.06, vyMin: -14, vyMax: -10 },
  medium: { lives: 3, bombChance: 0.12, vyMin: -16, vyMax: -12 },
  hard:   { lives: 2, bombChance: 0.20, vyMin: -19, vyMax: -14 },
}

function rand(min, max) { return Math.random() * (max - min) + min }

export default function FruitSlashGame({ difficulty = 'medium', onFinish }) {
  const { updateScore } = useUser()
  const navigate        = useNavigate()
  const canvasRef       = useRef(null)
  const stateRef        = useRef(null)
  const rafRef          = useRef(null)
  const dcfg            = SLASH_DIFF[difficulty] ?? SLASH_DIFF.medium

  const [phase,    setPhase]    = useState('playing')
  const [score,    setScore]    = useState(0)
  const [lives,    setLives]    = useState(dcfg.lives)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [combo,    setCombo]    = useState(0)

  const scoreRef   = useRef(0)
  const livesRef   = useRef(dcfg.lives)
  const timeRef    = useRef(GAME_DURATION)
  const comboRef   = useRef(0)
  const comboTimer = useRef(null)
  const lastTick   = useRef(Date.now())

  const endGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    stateRef.current = null
    updateScore('fruitslash', scoreRef.current)
    if (onFinish) { onFinish(scoreRef.current); return }
    setPhase('result')
  }, [updateScore, onFinish])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    stateRef.current = {
      fruits:    [],
      slices:    [],     // trail points
      particles: [],
      scorePopups: [],
      missPopups: [],    // "MISS! -1" floating text
      lifeFlash: 0,      // red overlay countdown
      spawnTimer: 0,
      alive: true,
    }

    let pointer = { x: -1, y: -1, prev: { x: -1, y: -1 }, down: false }

    const spawnFruit = () => {
      const s     = stateRef.current
      const isBomb = Math.random() < dcfg.bombChance
      const cfg   = isBomb ? BOMB : FRUITS[Math.floor(Math.random() * FRUITS.length)]
      const x     = rand(cfg.r + 20, W - cfg.r - 20)

      s.fruits.push({
        x, y: H + cfg.r,
        vx: rand(-1.8, 1.8),
        vy: rand(dcfg.vyMin, dcfg.vyMax),
        r: cfg.r,
        emoji: cfg.emoji,
        color: cfg.color,
        pts: isBomb ? 0 : cfg.pts,
        isBomb,
        sliced: false,
        angle: rand(0, Math.PI * 2),
        spin:  rand(-0.05, 0.05),
        // Slice halves
        half1: null, half2: null,
      })
    }

    // Slice detection: does segment from prev→cur intersect fruit circle?
    const segCircle = (x1, y1, x2, y2, cx, cy, r) => {
      const dx  = x2 - x1, dy = y2 - y1
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len === 0) return false
      const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / (len * len)))
      const nx = x1 + t * dx - cx
      const ny = y1 + t * dy - cy
      return nx * nx + ny * ny <= r * r
    }

    const onPointerDown = (e) => {
      const rect = canvas.getBoundingClientRect()
      const sx   = W / rect.width
      const sy   = H / rect.height
      const cx   = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * sx
      const cy   = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top)  * sy
      pointer = { x: cx, y: cy, prev: { x: cx, y: cy }, down: true }
    }
    const onPointerMove = (e) => {
      e.preventDefault()
      if (!pointer.down) return
      const rect = canvas.getBoundingClientRect()
      const sx   = W / rect.width
      const sy   = H / rect.height
      const cx   = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * sx
      const cy   = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top)  * sy
      const prev = { x: pointer.x, y: pointer.y }
      pointer = { x: cx, y: cy, prev, down: true }

      const s = stateRef.current
      if (!s) return

      // Record trail
      s.slices.push({ x: cx, y: cy, life: 8 })

      // Velocity of swipe
      const vel = Math.sqrt((cx - prev.x) ** 2 + (cy - prev.y) ** 2)
      if (vel < 4) return  // too slow to slice

      // Check slice
      s.fruits.forEach(f => {
        if (f.sliced || f.half1) return
        if (segCircle(prev.x, prev.y, cx, cy, f.x, f.y, f.r)) {
          f.sliced = true
          if (f.isBomb) {
            // Hit bomb — lose a life
            livesRef.current = Math.max(0, livesRef.current - 1)
            setLives(livesRef.current)
            // Big red flash
            s.particles.push(...Array.from({ length: 20 }, (_, i) => {
              const angle = (Math.PI * 2 * i) / 20
              return { x: f.x, y: f.y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                       r: 4, color: '#ff006e', life: 25, maxLife: 25 }
            }))
            if (livesRef.current <= 0) { endGame(); return }
          } else {
            // Score fruit
            const c     = comboRef.current + 1
            comboRef.current = c
            setCombo(c)
            clearTimeout(comboTimer.current)
            comboTimer.current = setTimeout(() => { comboRef.current = 0; setCombo(0) }, 1200)

            const mult   = c >= 5 ? 3 : c >= 3 ? 2 : 1
            const gained = f.pts * mult
            scoreRef.current += gained
            setScore(scoreRef.current)

            // Score popup
            s.scorePopups.push({ x: f.x, y: f.y, text: `+${gained}${mult > 1 ? ` ×${mult}` : ''}`, life: 40, maxLife: 40, color: f.color })

            // Juice particles
            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12 + rand(-0.3, 0.3)
              s.particles.push({
                x: f.x, y: f.y,
                vx: Math.cos(angle) * rand(2, 6),
                vy: Math.sin(angle) * rand(2, 6),
                r: rand(2, 5), color: f.color,
                life: rand(18, 30), maxLife: 30,
              })
            }

            // Slice halves
            const angle = Math.atan2(cy - prev.y, cx - prev.x) + Math.PI / 2
            f.half1 = { x: f.x - Math.cos(angle) * 6, y: f.y - Math.sin(angle) * 6,
                        vx: f.vx - Math.cos(angle) * 2, vy: f.vy - 1.5, angle: f.angle, spin: f.spin * 2, life: 35, maxLife: 35 }
            f.half2 = { x: f.x + Math.cos(angle) * 6, y: f.y + Math.sin(angle) * 6,
                        vx: f.vx + Math.cos(angle) * 2, vy: f.vy - 1.5, angle: f.angle, spin: -f.spin * 2, life: 35, maxLife: 35 }
          }
        }
      })
    }
    const onPointerUp = () => { pointer.down = false }

    canvas.addEventListener('mousedown',  onPointerDown)
    canvas.addEventListener('mousemove',  onPointerMove)
    canvas.addEventListener('mouseup',    onPointerUp)
    canvas.addEventListener('touchstart', onPointerDown, { passive: false })
    canvas.addEventListener('touchmove',  onPointerMove, { passive: false })
    canvas.addEventListener('touchend',   onPointerUp,   { passive: true })

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

      const prog = 1 - timeRef.current / GAME_DURATION

      // Spawn
      const spawnRate = Math.max(35, 75 - prog * 35)
      s.spawnTimer++
      if (s.spawnTimer >= spawnRate) {
        s.spawnTimer = 0
        spawnFruit()
        if (prog > 0.5 && Math.random() < 0.3) spawnFruit() // double spawn late game
      }

      // ── Background ───────────────────────────────
      ctx.fillStyle = '#080818'
      ctx.fillRect(0, 0, W, H)

      // Subtle grid
      ctx.strokeStyle = 'rgba(0,245,255,0.03)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

      // ── Slice trail ──────────────────────────────
      s.slices = s.slices
        .map(p => ({ ...p, life: p.life - 1 }))
        .filter(p => p.life > 0)

      if (s.slices.length > 1) {
        ctx.save()
        for (let i = 1; i < s.slices.length; i++) {
          const p1 = s.slices[i - 1], p2 = s.slices[i]
          const a  = p2.life / 8
          ctx.strokeStyle = `rgba(255,255,255,${a * 0.85})`
          ctx.lineWidth   = a * 3 + 1
          ctx.shadowColor = '#00f5ff'
          ctx.shadowBlur  = a * 12
          ctx.lineCap     = 'round'
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
        ctx.restore()
      }

      // ── Fruits ───────────────────────────────────
      const GRAVITY = 0.45
      s.fruits = s.fruits.filter(f => {
        // Drop missed fruits (lost a life)
        if (!f.sliced && f.y > H + f.r + 10) {
          if (!f.isBomb) {
            livesRef.current = Math.max(0, livesRef.current - 1)
            setLives(livesRef.current)
            s.lifeFlash = 18
            s.missPopups.push({ x: f.x, y: H - 60, text: 'MISS! -1 ❤️', life: 55 })
            if (livesRef.current <= 0) { endGame() }
          }
          return false
        }

        f.vy += GRAVITY
        f.angle += f.spin

        if (!f.sliced) {
          f.x += f.vx; f.y += f.vy
          ctx.save()
          ctx.translate(f.x, f.y)
          ctx.rotate(f.angle)
          ctx.font = `${f.r * 1.8}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(f.emoji, 0, 0)
          ctx.restore()
        } else if (f.half1 && f.half2) {
          // Draw halves
          [f.half1, f.half2].forEach((h, idx) => {
            h.x += h.vx; h.y += h.vy; h.vy += GRAVITY * 0.8
            h.angle += h.spin
            h.life--
            if (h.life > 0) {
              ctx.save()
              ctx.globalAlpha = h.life / h.maxLife
              ctx.translate(h.x, h.y)
              ctx.rotate(h.angle)
              ctx.scale(idx === 0 ? -0.6 : 0.6, 0.6)
              ctx.font = `${f.r * 1.8}px serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(f.emoji, 0, 0)
              ctx.restore()
            }
          })
          if (f.half1.life <= 0) return false
        }
        return true
      })

      // ── Particles ────────────────────────────────
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.93; p.vy *= 0.93; p.vy += 0.15
        p.life--
        ctx.save()
        ctx.globalAlpha = p.life / p.maxLife
        ctx.fillStyle   = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur  = 5
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        return p.life > 0
      })

      // ── Score popups ──────────────────────────────
      s.scorePopups = s.scorePopups.filter(sp => {
        sp.y -= 1.5; sp.life--
        ctx.save()
        ctx.globalAlpha = sp.life / sp.maxLife
        ctx.fillStyle   = sp.color
        ctx.shadowColor = sp.color
        ctx.shadowBlur  = 8
        ctx.font        = `bold 16px "Orbitron", sans-serif`
        ctx.textAlign   = 'center'
        ctx.fillText(sp.text, sp.x, sp.y)
        ctx.restore()
        return sp.life > 0
      })

      // ── Miss popups ───────────────────────────────
      s.missPopups = (s.missPopups || []).filter(mp => {
        mp.y -= 1; mp.life--
        ctx.save()
        ctx.globalAlpha = Math.min(1, mp.life / 25)
        ctx.fillStyle   = '#ff4466'
        ctx.shadowColor = '#ff4466'; ctx.shadowBlur = 10
        ctx.font        = 'bold 15px monospace'
        ctx.textAlign   = 'center'
        ctx.fillText(mp.text, Math.max(60, Math.min(W - 60, mp.x)), mp.y)
        ctx.restore()
        return mp.life > 0
      })

      // ── Life-lost red flash ────────────────────────
      if (s.lifeFlash > 0) {
        s.lifeFlash--
        ctx.fillStyle = `rgba(255,0,60,${(s.lifeFlash / 18) * 0.3})`
        ctx.fillRect(0, 0, W, H)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    lastTick.current = Date.now()
    rafRef.current   = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      stateRef.current = null
      canvas.removeEventListener('mousedown',  onPointerDown)
      canvas.removeEventListener('mousemove',  onPointerMove)
      canvas.removeEventListener('mouseup',    onPointerUp)
      canvas.removeEventListener('touchstart', onPointerDown)
      canvas.removeEventListener('touchmove',  onPointerMove)
      canvas.removeEventListener('touchend',   onPointerUp)
    }
  }, []) // eslint-disable-line

  if (phase === 'result') {
    return (
      <ResultScreen
        game="FRUIT SLASH"
        score={scoreRef.current}
        color="green"
        stats={[
          { label: 'SCORE',     value: scoreRef.current },
          { label: 'SURVIVED',  value: `${GAME_DURATION - timeRef.current}s` },
          { label: 'LIVES LEFT', value: `${livesRef.current}/${dcfg.lives}` },
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
        {/* Lives */}
        <div className="flex gap-1">
          {Array.from({ length: dcfg.lives }).map((_, i) => (
            <span key={i} style={{ fontSize: 18, opacity: i < lives ? 1 : 0.15, filter: i < lives ? 'none' : 'grayscale(1)' }}>❤️</span>
          ))}
        </div>
        {/* Timer */}
        <span className="font-orbitron text-sm font-black"
          style={{ color: timeLeft <= 10 ? '#ff006e' : '#9ca3af' }}>
          {timeLeft}s
        </span>
        {/* Score + combo */}
        <div className="text-right">
          <p className="font-orbitron text-sm font-black" style={{ color: '#00ff88' }}>{score}</p>
          {combo >= 2 && (
            <p className="font-orbitron text-[9px]" style={{ color: '#ffd700' }}>
              ×{combo >= 5 ? 3 : 2} COMBO!
            </p>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: '100%', maxWidth: W, height: 'auto', display: 'block', touchAction: 'none', cursor: 'crosshair' }} />

      <p className="font-orbitron text-[9px] text-gray-700 tracking-widest mt-2">
        SWIPE FAST TO SLASH · AVOID 💣
      </p>
    </div>
  )
}
