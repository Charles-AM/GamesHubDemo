import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const GRID_SIZE = 10
const GAME_TIME = 90
const WORDS_PER_GAME = 5

const WORD_POOL = [
  'FIRE','RAIN','SNOW','WIND','MOON','STAR','BOLT','GLOW','MIST',
  'TIGER','EAGLE','SHARK','HORSE','PANDA','COBRA','BRAVE','SWIFT','LIGHT',
  'CLOUD','STORM','OCEAN','MAGIC','POWER','SPEED','FLAME','FROST','RIVER',
  'CASTLE','DRAGON','JUNGLE','ROCKET','BRIDGE','PLANET','FLOWER','SCHOOL',
  'SILVER','GOLDEN','PYTHON','WIZARD','COSMIC','TURBO','BLAZE','CYBER',
  'NINJA','SOLAR','LASER','ULTRA','SUPER','ALPHA','OMEGA','SIGMA',
]

const DIRS = [
  { dr: 0, dc: 1 },  // right
  { dr: 1, dc: 0 },  // down
  { dr: 1, dc: 1 },  // diagonal
]

const WORD_COLORS = ['#00f5ff','#00ff88','#ffd700','#ff006e','#bf00ff']
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function buildGrid(words) {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''))
  const placed = []

  for (const word of words) {
    let success = false
    for (let attempt = 0; attempt < 80 && !success; attempt++) {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)]
      const maxR = dir.dr === 0 ? GRID_SIZE : GRID_SIZE - word.length
      const maxC = dir.dc === 0 ? GRID_SIZE : GRID_SIZE - word.length
      if (maxR <= 0 || maxC <= 0) continue
      const row = Math.floor(Math.random() * maxR)
      const col = Math.floor(Math.random() * maxC)

      // Check cells
      let fits = true
      for (let i = 0; i < word.length; i++) {
        const r = row + dir.dr * i
        const c = col + dir.dc * i
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) { fits = false; break }
      }
      if (!fits) continue

      // Place word
      const cells = []
      for (let i = 0; i < word.length; i++) {
        const r = row + dir.dr * i
        const c = col + dir.dc * i
        grid[r][c] = word[i]
        cells.push(`${r},${c}`)
      }
      placed.push({ word, cells })
      success = true
    }
  }

  // Fill blanks
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (grid[r][c] === '') grid[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)]

  return { grid, placed }
}

function pickWords() {
  const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, WORDS_PER_GAME)
}

function getLineCells(start, end) {
  if (!start || !end) return []
  const dr = Math.sign(end.r - start.r)
  const dc = Math.sign(end.c - start.c)
  const steps = Math.max(Math.abs(end.r - start.r), Math.abs(end.c - start.c))
  if (dr !== 0 && dc !== 0 && Math.abs(end.r - start.r) !== Math.abs(end.c - start.c)) return []
  const cells = []
  for (let i = 0; i <= steps; i++) cells.push({ r: start.r + dr * i, c: start.c + dc * i })
  return cells
}

export default function WordSearchGame({ onFinish }) {
  const [grid, setGrid] = useState([])
  const [placedWords, setPlacedWords] = useState([])
  const [foundWords, setFoundWords] = useState([])
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [phase, setPhase] = useState('playing')
  const [selecting, setSelecting] = useState(false)
  const [selStart, setSelStart] = useState(null)
  const [selEnd, setSelEnd] = useState(null)
  const [flash, setFlash] = useState(null)
  const { updateScore } = useUser()
  const navigate = useNavigate()
  const gridRef = useRef(null)

  const startGame = useCallback(() => {
    const words = pickWords()
    const { grid: g, placed } = buildGrid(words)
    setGrid(g)
    setPlacedWords(placed)
    setFoundWords([])
    setTimeLeft(GAME_TIME)
    setPhase('playing')
    setSelStart(null)
    setSelEnd(null)
    setFlash(null)
  }, [])

  useEffect(() => { startGame() }, [startGame])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) { setPhase('result'); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  const selCells = getLineCells(selStart, selEnd)
  const selKeys = new Set(selCells.map(c => `${c.r},${c.c}`))

  const foundCellMap = {}
  for (const fw of foundWords) {
    const pw = placedWords.find(p => p.word === fw.word)
    if (pw) pw.cells.forEach(k => { foundCellMap[k] = fw.color })
  }

  const checkSelection = useCallback((cells) => {
    const word = cells.map(c => grid[c.r]?.[c.c] || '').join('')
    const reversed = word.split('').reverse().join('')

    for (const pw of placedWords) {
      if (foundWords.find(f => f.word === pw.word)) continue
      if (pw.word === word || pw.word === reversed) {
        const color = WORD_COLORS[foundWords.length % WORD_COLORS.length]
        const newFound = [...foundWords, { word: pw.word, color }]
        setFoundWords(newFound)
        setFlash(pw.word)
        setTimeout(() => setFlash(null), 800)
        if (newFound.length === placedWords.length) {
          const score = newFound.length * 100 + timeLeft * 5
          updateScore('wordsearch', score)
          if (onFinish) { setTimeout(() => onFinish(score), 600) }
          else setTimeout(() => setPhase('result'), 600)
        }
        return
      }
    }
  }, [grid, placedWords, foundWords, timeLeft, updateScore])

  const getCellFromPoint = useCallback((x, y) => {
    const el = gridRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const relX = x - rect.left
    const relY = y - rect.top
    const cellW = rect.width / GRID_SIZE
    const cellH = rect.height / GRID_SIZE
    const c = Math.floor(relX / cellW)
    const r = Math.floor(relY / cellH)
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null
    return { r, c }
  }, [])

  const onPointerDown = useCallback((e, r, c) => {
    e.preventDefault()
    setSelecting(true)
    setSelStart({ r, c })
    setSelEnd({ r, c })
  }, [])

  const onPointerEnter = useCallback((r, c) => {
    if (selecting) setSelEnd({ r, c })
  }, [selecting])

  const onPointerUp = useCallback(() => {
    if (selecting && selCells.length > 0) checkSelection(selCells)
    setSelecting(false)
    setSelStart(null)
    setSelEnd(null)
  }, [selecting, selCells, checkSelection])

  // Touch support
  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const cell = getCellFromPoint(touch.clientX, touch.clientY)
    if (cell && selecting) setSelEnd(cell)
  }, [selecting, getCellFromPoint])

  const timerPct = (timeLeft / GAME_TIME) * 100
  const timerColor = timeLeft > 30 ? '#00ff88' : timeLeft > 10 ? '#ffd700' : '#ff006e'

  if (phase === 'result') {
    const found = foundWords.length
    const score = found * 100 + (found === placedWords.length ? timeLeft * 5 : 0)
    return (
      <ResultScreen
        game="WORD SEARCH"
        score={score}
        stats={[
          { label: 'FOUND', value: `${found}/${placedWords.length}` },
          { label: 'TIME LEFT', value: `${timeLeft}s` },
        ]}
        outcome={found === placedWords.length ? 'win' : 'lose'}
        onPlayAgain={startGame}
        onHub={() => navigate('/hub')}
        color="pink"
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-3 pt-5 pb-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate('/hub')} className="font-orbitron text-xs tracking-widest px-3 py-1 rounded-lg transition-all" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#555' }}>← QUIT</button>
        <span className="font-orbitron text-xs neon-text-pink tracking-widest">WORD SEARCH</span>
        <span className="font-orbitron text-xs" style={{ color: timerColor }}>{timeLeft}s</span>
      </div>

      {/* Timer bar */}
      <div className="h-1 bg-gray-800 rounded-full mb-4 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: timerColor }}
          animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
      </div>

      {/* Word list */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        {placedWords.map(pw => {
          const found = foundWords.find(f => f.word === pw.word)
          return (
            <motion.span
              key={pw.word}
              animate={flash === pw.word ? { scale: [1, 1.3, 1] } : {}}
              className="font-orbitron text-xs px-3 py-1 rounded-full"
              style={{
                background: found ? `${found.color}22` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${found ? found.color : 'rgba(255,255,255,0.1)'}`,
                color: found ? found.color : '#666',
                textDecoration: found ? 'line-through' : 'none',
              }}
            >
              {pw.word}
            </motion.span>
          )
        })}
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="grid mx-auto rounded-xl overflow-hidden touch-none"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: 2,
          width: '100%',
          maxWidth: 360,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,0,110,0.3)',
          padding: 4,
          userSelect: 'none',
        }}
        onTouchMove={onTouchMove}
        onTouchEnd={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = `${r},${c}`
            const isSelected = selKeys.has(key)
            const foundColor = foundCellMap[key]
            const isFound = !!foundColor

            let bg = 'transparent'
            let color = '#555'
            let border = 'transparent'

            if (isFound)     { bg = `${foundColor}33`; color = foundColor; border = `${foundColor}66` }
            if (isSelected)  { bg = 'rgba(255,0,110,0.3)'; color = '#fff'; border = '#ff006e' }

            return (
              <div
                key={key}
                onPointerDown={(e) => onPointerDown(e, r, c)}
                onPointerEnter={() => onPointerEnter(r, c)}
                onPointerUp={onPointerUp}
                className="flex items-center justify-center rounded font-orbitron font-bold cursor-pointer transition-all duration-100"
                style={{
                  aspectRatio: '1',
                  background: bg,
                  border: `1px solid ${border}`,
                  color,
                  fontSize: 13,
                  touchAction: 'none',
                }}
              >
                {letter}
              </div>
            )
          })
        )}
      </div>

      <p className="font-rajdhani text-gray-600 text-xs text-center mt-4 tracking-wider">
        DRAG ACROSS LETTERS TO SELECT A WORD
      </p>
    </div>
  )
}
