import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

/* ─── Layout ──────────────────────────────────────────────────────────── */
const W      = 390
const H      = 580
const HOLE_R = 44
const MOLE_R = 38

// 3×4 grid of holes
const COL_XS = [78, 195, 312]
const ROW_YS = [118, 228, 338, 448]
const HOLES  = []
for (let r = 0; r < 4; r++)
  for (let c = 0; c < 3; c++)
    HOLES.push({ id: r * 3 + c, x: COL_XS[c], y: ROW_YS[r] })

const GAME_DURATION = 60

/* ─── Difficulty ──────────────────────────────────────────────────────── */
// upTime: frames mole stays up  |  riseTime: frames to rise/sink
// spawnInterval: frames between spawns  |  maxUp: max moles visible at once
// goldenChance: chance of a golden mole (worth 3 pts, disappears faster)
const DIFF = {
  easy:   { upTime: 85,  riseTime: 14, spawnInterval: 58, maxUp: 2, goldenChance: 0.10 },
  medium: { upTime: 52,  riseTime: 10, spawnInterval: 38, maxUp: 4, goldenChance: 0.18 },
  hard:   { upTime: 28,  riseTime: 6,  spawnInterval: 20, maxUp: 6, goldenChance: 0.28 },
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function easeOut(t) { return 1 - Math.pow(1 - t, 3) }

/* ─── Draw ────────────────────────────────────────────────────────────── */
function drawHole(ctx, x, y) {
  ctx.beginPath(); ctx.ellipse(x, y, HOLE_R + 4, HOLE_R * 0.38, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill()
  ctx.beginPath(); ctx.ellipse(x, y, HOLE_R, HOLE_R * 0.34, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#0a0a1a'; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1.5; ctx.stroke()
}

function drawMole(ctx, x, holeY, progress, golden, isHit, hitProgress) {
  if (progress <= 0) return
  const pop    = easeOut(Math.min(progress, 1))
  const emerge = MOLE_R * 1.4 * pop
  const cx     = x
  const cy     = holeY - emerge + MOLE_R * 0.5
  const color  = golden ? '#ffd700' : '#00f5ff'

  ctx.save()

  // Hit burst ring
  if (isHit && hitProgress > 0) {
    const r = MOLE_R + hitProgress * 28
    const a = 1 - hitProgress
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = `${color}${Math.floor(a * 0xff).toString(16).padStart(2, '0')}`
    ctx.lineWidth = 3; ctx.stroke()
  }

  if (!isHit) {
    ctx.shadowColor = color; ctx.shadowBlur = golden ? 22 : 18
    ctx.beginPath(); ctx.arc(cx, cy, MOLE_R * pop, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.fill()
    ctx.shadowBlur = 0

    // Eyes
    ctx.fillStyle = '#080818'
    ctx.beginPath(); ctx.arc(cx - 10, cy - 7, 4.5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + 10, cy - 7, 4.5, 0, Math.PI * 2); ctx.fill()

    // Smile
    ctx.strokeStyle = '#080818'; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.arc(cx, cy + 4, 9, 0.2, Math.PI - 0.2); ctx.stroke()

    // Golden star label
    if (golden) {
      ctx.fillStyle = '#080818'
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'
      ctx.fillText('★3', cx, cy + MOLE_R * pop - 4)
    }
  }

  ctx.restore()
}

/* ─── Component ──────────────────────────────────────────────────────── */
export default function WhackGame({ difficulty = 'medium', onFinish }) {
  const navigate       = useNavigate()
  const { recordGame } = useUser()
  const cfg = DIFF[difficulty] || DIFF.medium

  const canvasRef   = useRef(null)
  const stRef       = useRef(null)
  const rafRef      = useRef(null)
  const lastTimeRef = useRef(null)
  const bestComboRef = useRef(0)

  const mkState = useCallback(() => ({
    moles: HOLES.map(h => ({
      holeId: h.id,
      state: 'hidden',     // hidden | rising | up | sinking | hit
      progress: 0,
      upTimer: 0,
      hitProgress: 0,
      golden: false,
    })),
    score:      0,
    combo:      0,
    comboTimer: 0,
    spawnTimer: cfg.spawnInterval,
    timeLeft:   GAME_DURATION,
    popups:     [],   // { x, y, text, color, life }
    missFlash:  0,    // red overlay countdown
    introTimer: 0,
  }), [cfg])

  useEffect(() => {
    stRef.current = mkState()
    bestComboRef.current = 0
  }, [mkState])

  const resetGame = useCallback(() => {
    stRef.current = mkState()
    bestComboRef.current = 0
    lastTimeRef.current = null
    setPhase('playing')
  }, [mkState])

  const [phase,  setPhase]  = useState('playing')
  const [finals, setFinals] = useState({ score: 0 })

  /* ── Tap handler ── */
  const handleTap = useCallback((e) => {
    e.preventDefault()
    const st = stRef.current; if (!st) return
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const tx = (e.clientX - rect.left) * (W / rect.width)
    const ty = (e.clientY - rect.top)  * (H / rect.height)

    // Find closest visible mole
    let bestDist = HOLE_R + 10, bestIdx = -1
    st.moles.forEach((m, i) => {
      if (m.state !== 'up' && m.state !== 'rising') return
      const h      = HOLES[m.holeId]
      const emerge = MOLE_R * 1.4 * easeOut(m.progress)
      const mx = h.x, my = h.y - emerge + MOLE_R * 0.5
      const dist = Math.hypot(tx - mx, ty - my)
      if (dist < bestDist) { bestDist = dist; bestIdx = i }
    })

    if (bestIdx === -1) return

    const m   = st.moles[bestIdx]
    const h   = HOLES[m.holeId]
    const pts = m.golden ? 3 : 1
    const comboBonus = st.combo >= 5 ? 2 : st.combo >= 3 ? 1 : 0
    const total = pts + comboBonus

    st.score     += total
    st.combo     += 1
    st.comboTimer = 90
    if (st.combo > bestComboRef.current) bestComboRef.current = st.combo
    m.state = 'hit'; m.hitProgress = 0

    const color = m.golden ? '#ffd700' : '#00f5ff'
    st.popups.push({ x: h.x, y: h.y - 50, text: `+${total}`, color, life: 45 })
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

      /* Spawn — rate speeds up over time */
      st.spawnTimer -= dt
      if (st.spawnTimer <= 0) {
        const upCount = st.moles.filter(m => m.state === 'up' || m.state === 'rising').length
        if (upCount < cfg.maxUp) {
          const hidden = st.moles.filter(m => m.state === 'hidden')
          if (hidden.length > 0) {
            const pick    = hidden[Math.floor(Math.random() * hidden.length)]
            const golden  = Math.random() < cfg.goldenChance
            pick.state    = 'rising'
            pick.progress = 0
            pick.golden   = golden
            // Golden moles disappear faster
            pick.upTimer  = (golden ? cfg.upTime * 0.55 : cfg.upTime) + Math.random() * 14 - 7
          }
        }
        const elapsed = GAME_DURATION - st.timeLeft
        const speedup = Math.max(0.5, 1 - (elapsed / GAME_DURATION) * 0.5)
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
            // Mole escaped — deduct 1 point
            m.state = 'sinking'
            st.score = Math.max(0, st.score - 1)
            st.combo = 0
            st.missFlash = 10
            const h2 = HOLES[m.holeId]
            st.popups.push({ x: h2.x, y: h2.y - 40, text: '-1', color: '#ff4466', life: 50 })
          }
        } else if (m.state === 'sinking') {
          m.progress -= (1 / cfg.riseTime) * dt
          if (m.progress <= 0) { m.progress = 0; m.state = 'hidden' }
        } else if (m.state === 'hit') {
          m.hitProgress += (1 / 12) * dt
          m.progress    -= (1 / 8)  * dt
          if (m.hitProgress >= 1 || m.progress <= 0) {
            m.progress = 0; m.state = 'hidden'; m.hitProgress = 0
          }
        }
      })

      /* Popups + timers */
      st.popups = st.popups
        .map(p => ({ ...p, y: p.y - 0.8 * dt, life: p.life - dt }))
        .filter(p => p.life > 0)
      if (st.missFlash  > 0) st.missFlash  -= dt
      if (st.introTimer > 0) st.introTimer -= dt

      /* Timer */
      st.timeLeft -= dt / 60
      if (st.timeLeft <= 0) {
        recordGame?.({ game: 'whack', score: st.score, mode: 'solo', won: true })
        const finalScore = st.score
        setFinals({ score: finalScore })
        if (onFinish) { onFinish(finalScore); return }
        setPhase('done')
        return
      }

      /* ── Draw ── */
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#080818'); bg.addColorStop(1, '#0d0a1a')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Glow orbs
      ctx.fillStyle = 'rgba(0,245,255,0.03)'
      ctx.beginPath(); ctx.arc(100, 200, 120, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(191,0,255,0.03)'
      ctx.beginPath(); ctx.arc(290, 380, 110, 0, Math.PI * 2); ctx.fill()

      // Holes
      HOLES.forEach(h => drawHole(ctx, h.x, h.y))

      // Moles (bottom rows first for depth)
      ;[...st.moles].sort((a, b) => HOLES[a.holeId].y - HOLES[b.holeId].y)
        .forEach(m => {
          const h = HOLES[m.holeId]
          drawMole(ctx, h.x, h.y, m.progress, m.golden, m.state === 'hit', m.hitProgress)
        })

      // Miss flash overlay
      if (st.missFlash > 0) {
        ctx.fillStyle = `rgba(255,0,60,${(st.missFlash / 10) * 0.22})`
        ctx.fillRect(0, 0, W, H)
      }

      // Score
      ctx.fillStyle = '#00f5ff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'right'
      ctx.fillText(`${st.score} PTS`, W - 14, 32)

      // Combo badge
      if (st.combo >= 3) {
        ctx.fillStyle = '#ffd700'
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10
        ctx.font = `bold ${Math.min(18, 11 + st.combo)}px monospace`; ctx.textAlign = 'center'
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

      // Popups (+pts / -1)
      st.popups.forEach(p => {
        const a = Math.min(1, p.life / 20)
        ctx.globalAlpha = a
        ctx.fillStyle   = p.color
        ctx.shadowColor = p.color; ctx.shadowBlur = 8
        ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'
        ctx.fillText(p.text, p.x, p.y)
        ctx.shadowBlur = 0
      })
      ctx.globalAlpha = 1

      // Intro hint
      if (st.introTimer > 0) {
        const a = Math.min(1, st.introTimer / 40)
        ctx.globalAlpha = a
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(W / 2 - 150, H / 2 - 24, 300, 46)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'
        ctx.fillText('HIT MOLES · MISS = -1 PTS', W / 2, H / 2 - 4)
        ctx.font = '11px monospace'
        ctx.fillStyle = '#ffd700'
        ctx.fillText('★ GOLDEN MOLES = 3 PTS', W / 2, H / 2 + 14)
        ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, cfg, recordGame, onFinish])

  if (phase === 'done') {
    return (
      <ResultScreen
        game="WHACK-A-MOLE"
        score={finals.score}
        color="cyan"
        stats={[
          { label: 'SCORE',      value: finals.score },
          { label: 'BEST COMBO', value: `×${bestComboRef.current}` },
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
