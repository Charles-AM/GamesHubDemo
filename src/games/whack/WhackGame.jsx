import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

/* ─── Layout ──────────────────────────────────────────────────────────── */
const W = 390
const H = 580
const HOLE_R   = 44      // hole radius
const MOLE_R   = 38      // mole radius (slightly smaller than hole)
const MAX_MISS = 3

// 3×4 grid of holes
const COL_XS = [78, 195, 312]
const ROW_YS = [118, 228, 338, 448]
const HOLES  = []
for (let r = 0; r < 4; r++)
  for (let c = 0; c < 3; c++)
    HOLES.push({ id: r * 3 + c, x: COL_XS[c], y: ROW_YS[r] })

/* ─── Mole types ──────────────────────────────────────────────────────── */
const MOLE_TYPES = {
  normal: { color: '#00f5ff', glow: '#00f5ff', pts: 1, label: null  },
  speedy: { color: '#ffd700', glow: '#ffd700', pts: 2, label: '×2'  },
  bomb:   { color: '#ff006e', glow: '#ff006e', pts: 0, label: '💣'  },
}

/* ─── Difficulty ──────────────────────────────────────────────────────── */
const DIFF = {
  easy:   { upTime: 78,  riseTime: 14, spawnInterval: 54,  maxUp: 3, bombChance: 0.08, speedyChance: 0.15 },
  medium: { upTime: 50,  riseTime: 10, spawnInterval: 36,  maxUp: 4, bombChance: 0.18, speedyChance: 0.26 },
  hard:   { upTime: 30,  riseTime: 6,  spawnInterval: 22,  maxUp: 5, bombChance: 0.28, speedyChance: 0.38 },
}

const GAME_DURATION = 60

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function easeOut(t) { return 1 - Math.pow(1 - t, 3) }
function easeIn(t)  { return t * t * t }

function pickType(cfg) {
  const r = Math.random()
  if (r < cfg.bombChance)  return 'bomb'
  if (r < cfg.bombChance + cfg.speedyChance) return 'speedy'
  return 'normal'
}

/* ─── Draw ────────────────────────────────────────────────────────────── */
function drawHole(ctx, x, y) {
  // Outer shadow ring
  ctx.beginPath(); ctx.ellipse(x, y, HOLE_R + 4, HOLE_R * 0.38, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill()
  // Hole
  ctx.beginPath(); ctx.ellipse(x, y, HOLE_R, HOLE_R * 0.34, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#0a0a1a'; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1.5; ctx.stroke()
}

function drawMole(ctx, x, holeY, progress, type, hit, hitProgress) {
  if (progress <= 0) return
  const t   = MOLE_TYPES[type]
  const pop = easeOut(Math.min(progress, 1))

  // How far above hole center the mole emerges (half-sphere peeking)
  const emerge = MOLE_R * 1.4 * pop
  const cx     = x
  const cy     = holeY - emerge + MOLE_R * 0.5

  ctx.save()

  // Hit burst ring
  if (hit && hitProgress > 0) {
    const r = MOLE_R + hitProgress * 28
    const a = 1 - hitProgress
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = `${t.color}${Math.floor(a * 0xff).toString(16).padStart(2,'0')}`
    ctx.lineWidth = 3; ctx.stroke()
  }

  if (!hit) {
    // Glow
    ctx.shadowColor = t.glow; ctx.shadowBlur = 18
    // Body (circle)
    ctx.beginPath(); ctx.arc(cx, cy, MOLE_R * pop, 0, Math.PI * 2)
    ctx.fillStyle = t.color; ctx.fill()
    ctx.shadowBlur = 0

    // Face
    if (type === 'bomb') {
      // Bomb face — X eyes
      ctx.strokeStyle = '#080818'; ctx.lineWidth = 2.5
      ;[[-10,-6],[10,-6]].forEach(([ex,ey]) => {
        ctx.beginPath()
        ctx.moveTo(cx+ex-5, cy+ey-5); ctx.lineTo(cx+ex+5, cy+ey+5)
        ctx.moveTo(cx+ex+5, cy+ey-5); ctx.lineTo(cx+ex-5, cy+ey+5)
        ctx.stroke()
      })
      // Fuse
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(cx, cy - MOLE_R * pop)
      ctx.quadraticCurveTo(cx + 12, cy - MOLE_R * pop - 14, cx + 6, cy - MOLE_R * pop - 22)
      ctx.stroke()
    } else {
      // Normal/speedy — dot eyes + smile
      ctx.fillStyle = '#080818'
      ctx.beginPath(); ctx.arc(cx - 10, cy - 7, 4.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + 10,  cy - 7, 4.5, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#080818'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(cx, cy + 4, 9, 0.2, Math.PI - 0.2); ctx.stroke()
      if (type === 'speedy') {
        // Speed lines
        ctx.strokeStyle = 'rgba(255,215,0,0.6)'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(cx - MOLE_R - 8, cy - 6); ctx.lineTo(cx - MOLE_R + 2, cy - 6); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx - MOLE_R - 12, cy + 4); ctx.lineTo(cx - MOLE_R - 2, cy + 4); ctx.stroke()
      }
    }

    // ×2 label for speedy
    if (t.label && type === 'speedy') {
      ctx.fillStyle = '#080818'
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'
      ctx.fillText('×2', cx, cy + MOLE_R * pop - 4)
    }
  }

  ctx.restore()
}

/* ─── Component ──────────────────────────────────────────────────────── */
export default function WhackGame({ difficulty = 'medium', onFinish }) {
  const navigate   = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef   = useRef(null)
  const stRef       = useRef(null)
  const rafRef      = useRef(null)
  const lastTimeRef = useRef(null)

  const mkState = useCallback(() => ({
    moles:       HOLES.map(h => ({
      holeId:     h.id,
      state:      'hidden',   // hidden | rising | up | sinking | hit
      progress:   0,          // 0-1 for rise/sink animation
      upTimer:    0,          // frames remaining while 'up'
      hitProgress:0,          // 0-1 burst animation
      type:       'normal',
    })),
    score:       0,
    misses:      0,
    combo:       0,
    comboTimer:  0,
    spawnTimer:  cfg.spawnInterval,
    timeLeft:    GAME_DURATION,
    gameOver:    false,
    flashHits:   [],   // {x,y,pts,life} floating +pts
    missFlashes:  [],  // {x,y,text,life,color} floating penalty text
    lifeFlash:    0,   // frames of red overlay when life is lost
    introTimer:   180, // 3s intro hint
  }), [cfg])

  useEffect(() => { stRef.current = mkState() }, [mkState])

  const resetGame = useCallback(() => {
    stRef.current   = mkState()
    lastTimeRef.current = null
    setPhase('playing')
  }, [mkState])

  const [phase,  setPhase]  = useState('playing')
  const [finals, setFinals] = useState({ score: 0, hits: 0, best: 0 })

  /* ── Tap handler ── */
  const handleTap = useCallback((e) => {
    e.preventDefault()
    const st = stRef.current; if (!st) return
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const tx = (e.clientX - rect.left) * (W / rect.width)
    const ty = (e.clientY - rect.top)  * (H / rect.height)

    // Find closest visible mole within HOLE_R
    let bestDist = HOLE_R + 8, bestIdx = -1
    st.moles.forEach((m, i) => {
      if (m.state !== 'up' && m.state !== 'rising') return
      const h = HOLES[m.holeId]
      const emerge = MOLE_R * 1.4 * easeOut(m.progress)
      const mx = h.x, my = h.y - emerge + MOLE_R * 0.5
      const dist = Math.hypot(tx - mx, ty - my)
      if (dist < bestDist) { bestDist = dist; bestIdx = i }
    })

    if (bestIdx === -1) return

    const m = st.moles[bestIdx]
    const h = HOLES[m.holeId]
    const t = MOLE_TYPES[m.type]

    if (m.type === 'bomb') {
      // Tapped a bomb → lose a life
      st.misses = Math.min(MAX_MISS, st.misses + 1)
      st.lifeFlash = 18
      st.missFlashes.push({ x: h.x, y: h.y - 50, text: '💣 -1 LIFE!', color: '#ff006e', life: 60 })
      m.state = 'hit'; m.hitProgress = 0
      if (st.misses >= MAX_MISS) st.gameOver = true
    } else {
      const comboBonus = st.combo >= 5 ? 2 : st.combo >= 3 ? 1 : 0
      const pts = t.pts + comboBonus
      st.score  += pts
      st.combo  += 1
      st.comboTimer = 90
      m.state = 'hit'; m.hitProgress = 0

      // Floating +pts
      st.flashHits.push({ x: h.x, y: h.y - 50, pts, life: 45 })
    }
  }, [])

  /* ── RAF loop ── */
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')

    function tick(ts) {
      if (!lastTimeRef.current) lastTimeRef.current = ts
      const dt = Math.min((ts - lastTimeRef.current) / 16.67, 3)
      lastTimeRef.current = ts

      const st = stRef.current

      /* Combo timer */
      if (st.comboTimer > 0) { st.comboTimer -= dt; if (st.comboTimer <= 0) st.combo = 0 }

      /* Spawn */
      st.spawnTimer -= dt
      if (st.spawnTimer <= 0) {
        const upCount = st.moles.filter(m => m.state === 'up' || m.state === 'rising').length
        if (upCount < cfg.maxUp) {
          const hidden = st.moles.filter(m => m.state === 'hidden')
          if (hidden.length > 0) {
            const pick = hidden[Math.floor(Math.random() * hidden.length)]
            pick.state    = 'rising'
            pick.progress = 0
            pick.type     = pickType(cfg)
            pick.upTimer  = cfg.upTime + Math.random() * 20 - 10
          }
        }
        // Spawn rate speeds up slightly over time
        const speedup = Math.max(0.55, 1 - (GAME_DURATION - st.timeLeft) / GAME_DURATION * 0.45)
        st.spawnTimer = cfg.spawnInterval * speedup
      }

      /* Update moles */
      st.moles.forEach(m => {
        if (m.state === 'rising') {
          m.progress += (1 / cfg.riseTime) * dt
          if (m.progress >= 1) { m.progress = 1; m.state = 'up' }
        } else if (m.state === 'up') {
          m.upTimer -= dt
          if (m.upTimer <= 0) {
            // Missed!
            m.state = 'sinking'
            if (m.type !== 'bomb') {  // missing a bomb = no penalty
              st.misses += 1
              st.lifeFlash = 12
              st.combo = 0
              const h2 = HOLES[m.holeId]
              st.missFlashes.push({ x: h2.x, y: h2.y - 40, text: 'MISSED! -1', color: '#ff4466', life: 55 })
              if (st.misses >= MAX_MISS) st.gameOver = true
            }
          }
        } else if (m.state === 'sinking') {
          m.progress -= (1 / cfg.riseTime) * dt
          if (m.progress <= 0) { m.progress = 0; m.state = 'hidden' }
        } else if (m.state === 'hit') {
          m.hitProgress += (1 / 12) * dt
          m.progress    -= (1 / 8) * dt
          if (m.hitProgress >= 1 || m.progress <= 0) {
            m.progress = 0; m.state = 'hidden'; m.hitProgress = 0
          }
        }
      })

      /* Flash hits + miss flashes */
      st.flashHits  = st.flashHits.map(f => ({ ...f, y: f.y - 0.8 * dt, life: f.life - dt })).filter(f => f.life > 0)
      st.missFlashes = st.missFlashes.map(f => ({ ...f, y: f.y - 0.5 * dt, life: f.life - dt })).filter(f => f.life > 0)
      if (st.lifeFlash > 0) st.lifeFlash -= dt
      if (st.introTimer > 0) st.introTimer -= dt

      /* Timer */
      st.timeLeft -= dt / 60
      if (st.timeLeft <= 0 || st.gameOver) {
        recordGame?.({ game: 'whack', score: st.score, mode: 'solo', won: !st.gameOver })
        const finalScore = st.score
        setFinals({ score: finalScore })
        if (onFinish) { onFinish(finalScore); return }
        setPhase('done')
        return
      }

      /* ── Draw ── */
      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#080818'); bg.addColorStop(1, '#0d0a1a')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Subtle grid glow orbs
      ctx.fillStyle = 'rgba(0,245,255,0.03)'
      ctx.beginPath(); ctx.arc(100, 200, 120, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = 'rgba(191,0,255,0.03)'
      ctx.beginPath(); ctx.arc(290, 380, 110, 0, Math.PI*2); ctx.fill()

      // Draw holes (back to front, moles over holes)
      HOLES.forEach(h => drawHole(ctx, h.x, h.y))

      // Draw moles (bottom rows first for depth)
      ;[...st.moles].sort((a,b) => HOLES[a.holeId].y - HOLES[b.holeId].y)
        .forEach(m => {
          const h = HOLES[m.holeId]
          drawMole(ctx, h.x, h.y, m.progress, m.type, m.state === 'hit', m.hitProgress)
        })

      // Miss hearts
      for (let i = 0; i < MAX_MISS; i++) {
        const lost = i < st.misses
        ctx.beginPath()
        const hx = 14 + i * 26, hy = 28
        // Simple heart shape
        ctx.fillStyle = lost ? 'rgba(255,0,110,0.25)' : '#ff006e'
        ctx.shadowColor = lost ? 'transparent' : '#ff006e'
        ctx.shadowBlur  = lost ? 0 : 8
        ctx.font = '18px sans-serif'; ctx.textAlign = 'left'
        ctx.fillText(lost ? '🖤' : '❤️', hx - 9, hy + 7)
        ctx.shadowBlur = 0
      }

      // Score
      ctx.fillStyle = '#00f5ff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'right'
      ctx.fillText(`${st.score} PTS`, W - 14, 32)

      // Combo
      if (st.combo >= 3) {
        ctx.fillStyle = '#ffd700'
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10
        ctx.font = `bold ${11 + st.combo}px monospace`; ctx.textAlign = 'center'
        ctx.fillText(`COMBO ×${st.combo}!`, W / 2, 52)
        ctx.shadowBlur = 0
      }

      // Timer bar
      const ratio  = Math.max(0, st.timeLeft / GAME_DURATION)
      const barClr = ratio > 0.4 ? '#00f5ff' : ratio > 0.2 ? '#ffd700' : '#ff006e'
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, H - 5, W, 5)
      ctx.fillStyle = barClr; ctx.fillRect(0, H - 5, W * ratio, 5)
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = '10px monospace'; ctx.textAlign = 'center'
      ctx.fillText(`${Math.ceil(st.timeLeft)}s`, W / 2, 32)

      // Life-lost red flash overlay
      if (st.lifeFlash > 0) {
        ctx.fillStyle = `rgba(255,0,60,${(st.lifeFlash / 18) * 0.28})`
        ctx.fillRect(0, 0, W, H)
      }

      // Floating +pts
      st.flashHits.forEach(f => {
        const a = Math.min(1, f.life / 20)
        ctx.fillStyle   = `rgba(255,215,0,${a})`
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8
        ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'
        ctx.fillText(`+${f.pts}`, f.x, f.y)
        ctx.shadowBlur = 0
      })

      // Miss / bomb penalty text
      st.missFlashes.forEach(f => {
        const a = Math.min(1, f.life / 30)
        ctx.fillStyle   = f.color
        ctx.shadowColor = f.color; ctx.shadowBlur = 10
        ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'
        ctx.globalAlpha = a
        ctx.fillText(f.text, f.x, f.y)
        ctx.globalAlpha = 1; ctx.shadowBlur = 0
      })

      // Intro hint (fades out after 3s)
      if (st.introTimer > 0) {
        const a = Math.min(1, st.introTimer / 40)
        ctx.globalAlpha = a
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(W/2 - 145, H/2 - 22, 290, 44)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'
        ctx.fillText('HIT MOLES · AVOID 💣 BOMBS', W/2, H/2 + 5)
        ctx.globalAlpha = 1
      }

      // Game over flash overlay
      if (st.gameOver) {
        ctx.fillStyle = 'rgba(255,0,110,0.35)'; ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#ff006e'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center'
        ctx.shadowColor = '#ff006e'; ctx.shadowBlur = 20
        ctx.fillText('OUT!', W / 2, H / 2)
        ctx.shadowBlur = 0
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, cfg, recordGame])

  if (phase === 'done') {
    return (
      <ResultScreen
        game="WHACK-A-MOLE"
        score={finals.score}
        color="cyan"
        outcome={stRef.current?.misses >= MAX_MISS ? 'lose' : undefined}
        stats={[
          { label: 'SCORE', value: finals.score },
          { label: 'COMBO', value: `×${Math.max(...(stRef.current?.flashHits?.map(()=>0)||[0]), 0)}` },
        ]}
        onPlayAgain={resetGame}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <div style={{ background: '#080818', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={W} height={H}
        className="game-canvas"
        onContextMenu={e => e.preventDefault()}
        onPointerDown={handleTap}
      />
    </div>
  )
}
