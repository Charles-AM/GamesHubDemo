import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'

const COLS          = 18
const ROWS          = 18
const INIT_MS       = 200   // starting tick speed
const MIN_MS        = 75    // fastest tick speed
const SPEED_EVERY   = 4     // foods eaten before speed up
const PTS_PER_FOOD  = 10
const GAME_DURATION = 60    // seconds

const DIR = {
  UP:    { x: 0,  y: -1 },
  DOWN:  { x: 0,  y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x: 1,  y:  0 },
}

const opposite = (d) => ({ x: -d.x, y: -d.y })

function randomFood(snake) {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`))
  let pos
  do { pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) } }
  while (occupied.has(`${pos.x},${pos.y}`))
  return pos
}

function initState() {
  const snake = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }]
  return { snake, food: randomFood(snake), dir: DIR.RIGHT, nextDir: DIR.RIGHT }
}

export default function SnakeGame({ onFinish }) {
  const { updateScore } = useUser()
  const navigate        = useNavigate()

  const [phase,    setPhase]    = useState('playing') // playing | dead | result
  const [score,    setScore]    = useState(0)
  const [foodEaten,setFoodEaten]= useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [flash,    setFlash]    = useState(false)   // food-eaten flash
  const [gameState,setGameState]= useState(initState)

  const gsRef      = useRef(initState())  // mutable game state for the tick loop
  const scoreRef   = useRef(0)
  const phaseRef   = useRef('playing')
  const dirRef     = useRef(DIR.RIGHT)
  const tickRef    = useRef(null)
  const touchRef   = useRef(null)

  // Sync refs
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── End game ───────────────────────────────────────────────
  const endGame = useCallback(() => {
    if (phaseRef.current === 'result') return
    clearInterval(tickRef.current)
    setPhase('result')
    updateScore('snake', scoreRef.current)
    if (onFinish) onFinish(scoreRef.current)
  }, [updateScore, onFinish])

  // ── Countdown timer ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) { endGame(); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, endGame])

  // ── Game tick ──────────────────────────────────────────────
  const tick = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    const gs = gsRef.current

    // Consume buffered direction (prevent 180° reversal)
    const newDir = (gs.nextDir.x === -gs.dir.x && gs.nextDir.y === -gs.dir.y)
      ? gs.dir : gs.nextDir
    gs.dir = newDir
    dirRef.current = newDir

    const head  = gs.snake[0]
    const newHead = { x: head.x + newDir.x, y: head.y + newDir.y }

    // Wall collision
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      setPhase('dead')
      phaseRef.current = 'dead'
      setTimeout(() => endGame(), 600)
      return
    }

    // Self collision
    if (gs.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      setPhase('dead')
      phaseRef.current = 'dead'
      setTimeout(() => endGame(), 600)
      return
    }

    const ateFood = newHead.x === gs.food.x && newHead.y === gs.food.y
    const newSnake = ateFood ? [newHead, ...gs.snake] : [newHead, ...gs.snake.slice(0, -1)]

    let newFood = gs.food
    let newScore = scoreRef.current
    let newFoodEaten = gs.foodEaten || 0

    if (ateFood) {
      newFoodEaten++
      newScore += PTS_PER_FOOD
      scoreRef.current = newScore
      gs.foodEaten = newFoodEaten
      newFood = randomFood(newSnake)
      setScore(newScore)
      setFoodEaten(newFoodEaten)
      setFlash(true)
      setTimeout(() => setFlash(false), 150)

      // Speed up
      const newMs = Math.max(MIN_MS, INIT_MS - newFoodEaten * Math.floor((INIT_MS - MIN_MS) / 20))
      clearInterval(tickRef.current)
      tickRef.current = setInterval(tick, newMs)
    }

    gs.snake = newSnake
    gs.food  = newFood
    gsRef.current = gs
    setGameState({ snake: [...newSnake], food: newFood, dir: newDir, nextDir: newDir })
  }, [endGame])

  // Start tick loop
  useEffect(() => {
    tickRef.current = setInterval(tick, INIT_MS)
    return () => clearInterval(tickRef.current)
  }, [tick])

  // ── Direction input ────────────────────────────────────────
  const setDir = useCallback((newDir) => {
    // Don't allow 180° reversal
    const cur = dirRef.current
    if (newDir.x === -cur.x && newDir.y === -cur.y) return
    gsRef.current.nextDir = newDir
  }, [])

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowUp: DIR.UP, ArrowDown: DIR.DOWN, ArrowLeft: DIR.LEFT, ArrowRight: DIR.RIGHT,
                    w: DIR.UP, s: DIR.DOWN, a: DIR.LEFT, d: DIR.RIGHT }
      if (map[e.key]) { e.preventDefault(); setDir(map[e.key]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setDir])

  // Touch / swipe
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (!touchRef.current) return
    const t  = e.changedTouches[0]
    const dx = t.clientX - touchRef.current.x
    const dy = t.clientY - touchRef.current.y
    touchRef.current = null
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? DIR.RIGHT : DIR.LEFT)
    else                              setDir(dy > 0 ? DIR.DOWN  : DIR.UP)
  }, [setDir])

  // ── Restart ────────────────────────────────────────────────
  const restart = () => {
    clearInterval(tickRef.current)
    const init = initState()
    gsRef.current    = { ...init, foodEaten: 0 }
    scoreRef.current = 0
    dirRef.current   = DIR.RIGHT
    phaseRef.current = 'playing'
    setScore(0); setFoodEaten(0); setTimeLeft(GAME_DURATION)
    setGameState(init); setPhase('playing'); setFlash(false)
    tickRef.current = setInterval(tick, INIT_MS)
  }

  // ── Render ─────────────────────────────────────────────────
  const snakeSet = new Set(gameState.snake.map(s => `${s.x},${s.y}`))
  const headKey  = `${gameState.snake[0]?.x},${gameState.snake[0]?.y}`
  const foodKey  = `${gameState.food.x},${gameState.food.y}`
  const speed    = Math.round(((INIT_MS - Math.max(MIN_MS, INIT_MS - foodEaten * Math.floor((INIT_MS - MIN_MS) / 20))) / (INIT_MS - MIN_MS)) * 100)
  const timerPct = timeLeft / GAME_DURATION
  const timerColor = timerPct > 0.4 ? '#00ff88' : timerPct > 0.2 ? '#ffd700' : '#ff006e'

  // Result screen
  if (phase === 'result') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm">
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest text-center mb-3">SNAKE</p>
          <div className="glass-card rounded-2xl p-6 text-center mb-4"
            style={{ border: '1px solid rgba(0,255,136,0.4)' }}>
            <p className="font-rajdhani text-gray-500 text-xs tracking-widest mb-1">FINAL SCORE</p>
            <motion.p initial={{ scale: 0.5 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="font-orbitron text-5xl font-black neon-text-green">{score}</motion.p>
          </div>
          <div className="glass-card rounded-2xl p-4 mb-4 flex justify-around border border-gray-800">
            {[
              { label: 'FOOD', value: foodEaten },
              { label: 'LENGTH', value: foodEaten + 3 },
              { label: 'TIME', value: `${GAME_DURATION - timeLeft}s` },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="font-orbitron text-[10px] text-gray-600 tracking-wider">{s.label}</p>
                <p className="font-orbitron text-lg font-bold neon-text-green">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {!onFinish && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={restart}
                className="w-full py-3 rounded-xl font-orbitron text-sm tracking-widest"
                style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.4)', color: '#00ff88' }}>
                PLAY AGAIN
              </motion.button>
            )}
            <button onClick={() => navigate('/hub')}
              className="w-full py-3 rounded-xl font-orbitron text-xs tracking-widest border border-gray-800 text-gray-600">
              ← QUIT
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center px-3 pt-2 select-none">

      {/* Header bar */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <button onClick={() => navigate('/hub')}
          className="font-orbitron text-[9px] tracking-widest px-3 py-1 rounded-lg transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#555' }}>← QUIT</button>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="font-orbitron text-lg font-black neon-text-green leading-none">{score}</p>
            <p className="font-rajdhani text-[9px] text-gray-600">SCORE</p>
          </div>
          <div className="text-center">
            <p className="font-orbitron text-lg font-black leading-none" style={{ color: timerColor }}>{timeLeft}</p>
            <p className="font-rajdhani text-[9px] text-gray-600">SEC</p>
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1 rounded-full mb-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full"
          style={{ background: timerColor, width: `${timerPct * 100}%` }}
          transition={{ duration: 0.9 }} />
      </div>

      {/* Game board */}
      <div
        className="w-full rounded-2xl overflow-hidden relative"
        style={{
          aspectRatio: '1',
          background: phase === 'dead' ? 'rgba(255,0,110,0.08)' : flash ? 'rgba(0,255,136,0.06)' : 'rgba(255,255,255,0.03)',
          border: phase === 'dead' ? '1px solid rgba(255,0,110,0.4)' : '1px solid rgba(255,255,255,0.08)',
          transition: 'background 0.15s, border 0.15s',
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: '1px',
          padding: '4px',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}>

        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const x   = i % COLS
          const y   = Math.floor(i / COLS)
          const key = `${x},${y}`
          const isHead = key === headKey
          const isSnake = snakeSet.has(key)
          const isFood  = key === foodKey

          return (
            <div key={key} style={{
              borderRadius: isHead ? 4 : isSnake ? 3 : isFood ? '50%' : 2,
              background: isHead
                ? '#00ff88'
                : isSnake
                  ? phase === 'dead' ? '#ff006e' : '#00cc66'
                  : isFood
                    ? '#ffd700'
                    : 'transparent',
              boxShadow: isHead
                ? '0 0 8px #00ff88'
                : isFood
                  ? '0 0 6px #ffd700'
                  : 'none',
              transition: isSnake || isFood ? 'none' : undefined,
            }} />
          )
        })}

        {/* Death overlay */}
        <AnimatePresence>
          {phase === 'dead' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)' }}>
              <p className="font-orbitron text-2xl font-black neon-text-pink">DEAD</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Speed indicator */}
      {speed > 0 && (
        <div className="w-full flex items-center gap-2 mt-2 px-1">
          <p className="font-orbitron text-[9px] text-gray-600">SPEED</p>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${speed}%`, background: `hsl(${120 - speed * 1.2}, 100%, 55%)` }} />
          </div>
          <p className="font-orbitron text-[9px]" style={{ color: `hsl(${120 - speed * 1.2}, 100%, 60%)` }}>
            {foodEaten}🍎
          </p>
        </div>
      )}

      {/* D-Pad */}
      <div className="mt-4 flex flex-col items-center gap-1">
        <DPadBtn onClick={() => setDir(DIR.UP)}><Arrow dir="up" /></DPadBtn>
        <div className="flex gap-1">
          <DPadBtn onClick={() => setDir(DIR.LEFT)}><Arrow dir="left" /></DPadBtn>
          <div className="w-12 h-12" />
          <DPadBtn onClick={() => setDir(DIR.RIGHT)}><Arrow dir="right" /></DPadBtn>
        </div>
        <DPadBtn onClick={() => setDir(DIR.DOWN)}><Arrow dir="down" /></DPadBtn>
      </div>

    </div>
  )
}

function Arrow({ dir }) {
  const paths = {
    up:    'M12 7 L5 17 L19 17 Z',
    down:  'M12 17 L5 7 L19 7 Z',
    left:  'M7 12 L17 5 L17 19 Z',
    right: 'M17 12 L7 5 L7 19 Z',
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#00ff88">
      <path d={paths[dir]} />
    </svg>
  )
}

function DPadBtn({ onClick, children }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onPointerDown={(e) => { e.preventDefault(); onClick() }}
      className="w-12 h-12 rounded-xl flex items-center justify-center font-orbitron text-sm font-bold select-none"
      style={{
        background: 'rgba(0,255,136,0.08)',
        border: '1px solid rgba(0,255,136,0.25)',
        color: '#00ff88',
        touchAction: 'none',
      }}>
      {children}
    </motion.button>
  )
}
