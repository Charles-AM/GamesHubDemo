import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'
import { PUZZLES } from './puzzles'

const GAME_TIME = 180
const HISTORY_KEY = 'arcadia_crossword_history'

function getPuzzle() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  const available = PUZZLES.filter(p => !history.includes(p.id))
  const pool = available.length > 0 ? available : PUZZLES
  const puzzle = pool[Math.floor(Math.random() * pool.length)]
  const newHistory = [...history, puzzle.id].slice(-5)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
  return puzzle
}

const KEYBOARD = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['⌫','Z','X','C','V','B','N','M','✓'],
]

export default function CrosswordGame({ onFinish }) {
  const [puzzle, setPuzzle]       = useState(null)
  const [userGrid, setUserGrid]   = useState([])
  const [activeCell, setActiveCell] = useState(null)
  const [activeDir, setActiveDir] = useState('across')
  const [correctCells, setCorrectCells] = useState(new Set())
  const [wrongFlash, setWrongFlash]     = useState(null)
  const [doneWords, setDoneWords]       = useState(new Set())
  const [timeLeft, setTimeLeft]   = useState(GAME_TIME)
  const [phase, setPhase]         = useState('playing')
  const { updateScore } = useUser()
  const navigate = useNavigate()

  const startGame = useCallback(() => {
    const p = getPuzzle()
    setPuzzle(p)
    setUserGrid(Array(5).fill(null).map(() => Array(5).fill('')))
    setActiveCell({ r: 0, c: 0 })
    setActiveDir('across')
    setCorrectCells(new Set())
    setWrongFlash(null)
    setDoneWords(new Set())
    setTimeLeft(GAME_TIME)
    setPhase('playing')
  }, [])

  useEffect(() => { startGame() }, [startGame])

  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) { setPhase('result'); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  // Cells belonging to a word
  const getWordCells = useCallback((dir, idx) => {
    if (!puzzle) return []
    if (dir === 'across') {
      return Array.from({ length: 5 }, (_, c) => ({ r: idx, c }))
    } else {
      return Array.from({ length: 5 }, (_, r) => ({ r, c: puzzle.down.col }))
    }
  }, [puzzle])

  // Which words does this cell belong to?
  const getCellWords = useCallback((r, c) => {
    if (!puzzle) return []
    const words = []
    words.push({ dir: 'across', idx: r })
    if (c === puzzle.down.col) words.push({ dir: 'down', idx: 0 })
    return words
  }, [puzzle])

  const getActiveWordCells = useCallback(() => {
    if (!activeCell || !puzzle) return []
    if (activeDir === 'across') return getWordCells('across', activeCell.r)
    return getWordCells('down', 0)
  }, [activeCell, activeDir, puzzle, getWordCells])

  const checkWord = useCallback((dir, idx, grid) => {
    if (!puzzle) return false
    const cells = getWordCells(dir, idx)
    const word = dir === 'across'
      ? puzzle.grid[idx].join('')
      : puzzle.down.word
    const typed = cells.map(({ r, c }) => grid[r][c]).join('')
    return typed === word
  }, [puzzle, getWordCells])

  const handleLetter = useCallback((letter) => {
    if (!activeCell || !puzzle || phase !== 'playing') return
    const { r, c } = activeCell

    if (letter === '⌫') {
      setUserGrid(g => {
        const next = g.map(row => [...row])
        next[r][c] = ''
        return next
      })
      return
    }

    if (letter === '✓') return

    const expected = puzzle.grid[r][c]
    const newGrid = userGrid.map(row => [...row])
    newGrid[r][c] = letter

    setUserGrid(newGrid)

    if (letter === expected) {
      // Correct — add to correct cells
      const key = `${r},${c}`
      const newCorrect = new Set(correctCells)
      newCorrect.add(key)
      setCorrectCells(newCorrect)

      // Check if current word is complete
      const newDone = new Set(doneWords)
      if (checkWord(activeDir, activeDir === 'across' ? r : 0, newGrid)) {
        newDone.add(`${activeDir}-${activeDir === 'across' ? r : 0}`)
        setDoneWords(newDone)
      }
      // Also check the other word this cell belongs to
      if (activeDir === 'across' && c === puzzle.down.col) {
        if (checkWord('down', 0, newGrid)) {
          newDone.add('down-0')
          setDoneWords(newDone)
        }
      } else if (activeDir === 'down') {
        if (checkWord('across', r, newGrid)) {
          newDone.add(`across-${r}`)
          setDoneWords(newDone)
        }
      }

      // Check if all 6 words done
      const totalWords = 6 // 5 across + 1 down
      if (newDone.size >= totalWords) {
        const score = newDone.size * 100 + timeLeft * 3
        updateScore('crossword', score)
        if (onFinish) { setTimeout(() => onFinish(score), 500) }
        else setTimeout(() => setPhase('result'), 500)
        return
      }

      // Advance to next empty cell in word
      const wordCells = getActiveWordCells()
      const curIdx = wordCells.findIndex(cell => cell.r === r && cell.c === c)
      for (let i = curIdx + 1; i < wordCells.length; i++) {
        const { r: nr, c: nc } = wordCells[i]
        if (newGrid[nr][nc] === '') { setActiveCell({ r: nr, c: nc }); return }
      }
    } else {
      // Wrong — flash red
      setWrongFlash(`${r},${c}`)
      setTimeout(() => {
        setWrongFlash(null)
        setUserGrid(g => {
          const reset = g.map(row => [...row])
          reset[r][c] = ''
          return reset
        })
      }, 400)
    }
  }, [activeCell, puzzle, phase, userGrid, correctCells, doneWords, activeDir,
      checkWord, getActiveWordCells, timeLeft, updateScore])

  const handleCellTap = useCallback((r, c) => {
    if (!puzzle) return
    if (activeCell?.r === r && activeCell?.c === c) {
      // Toggle direction if cell is in both words
      if (c === puzzle.down.col) setActiveDir(d => d === 'across' ? 'down' : 'across')
    } else {
      setActiveCell({ r, c })
      // Default to across, unless only down word here
      const words = getCellWords(r, c)
      if (words.length === 1) setActiveDir(words[0].dir)
      else setActiveDir('across')
    }
  }, [activeCell, puzzle, getCellWords])

  const activeWordCells = getActiveWordCells()
  const activeWordKeys = new Set(activeWordCells.map(({ r, c }) => `${r},${c}`))

  const getActiveClue = () => {
    if (!puzzle || !activeCell) return ''
    if (activeDir === 'across') return puzzle.across[activeCell.r].clue
    return puzzle.down.clue
  }

  const timerColor = timeLeft > 60 ? '#00ff88' : timeLeft > 20 ? '#ffd700' : '#ff006e'

  if (phase === 'result') {
    const score = doneWords.size * 100 + (doneWords.size === 6 ? timeLeft * 3 : 0)
    return (
      <ResultScreen
        game="CROSSWORD"
        score={score}
        stats={[
          { label: 'WORDS', value: `${doneWords.size}/6` },
          { label: 'TIME LEFT', value: `${timeLeft}s` },
        ]}
        outcome={doneWords.size === 6 ? 'win' : 'lose'}
        onPlayAgain={startGame}
        onHub={() => navigate('/hub')}
        color="gold"
      />
    )
  }

  if (!puzzle) return null

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate('/hub')} className="font-orbitron text-xs tracking-widest px-3 py-1 rounded-lg transition-all" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#555' }}>← QUIT</button>
        <div className="text-center">
          <span className="font-orbitron text-xs neon-text-gold tracking-widest">CROSSWORD</span>
          <p className="font-rajdhani text-[10px] text-gray-500">{puzzle.theme}</p>
        </div>
        <span className="font-orbitron text-sm font-bold" style={{ color: timerColor }}>{timeLeft}s</span>
      </div>

      {/* Timer bar */}
      <div className="h-1 bg-gray-800 rounded-full mb-4">
        <motion.div className="h-full rounded-full" style={{ background: timerColor }}
          animate={{ width: `${(timeLeft / GAME_TIME) * 100}%` }}
          transition={{ duration: 1, ease: 'linear' }} />
      </div>

      {/* Grid */}
      <div className="mx-auto mb-4" style={{ width: '100%', maxWidth: 320 }}>
        {puzzle.grid.map((row, r) => (
          <div key={r} className="flex gap-1.5 mb-1.5">
            {row.map((_, c) => {
              const key = `${r},${c}`
              const isActive = activeCell?.r === r && activeCell?.c === c
              const isInWord = activeWordKeys.has(key)
              const isCorrect = correctCells.has(key)
              const isWrong = wrongFlash === key
              const isDown = c === puzzle.down.col
              const letter = userGrid[r]?.[c] || ''
              const isWordStart = (c === 0) || (isDown && r === 0)

              let bg = 'rgba(255,255,255,0.04)'
              let border = 'rgba(255,255,255,0.08)'
              let textColor = '#fff'

              if (isInWord)  { bg = 'rgba(255,215,0,0.12)'; border = 'rgba(255,215,0,0.4)' }
              if (isActive)  { bg = 'rgba(255,215,0,0.25)'; border = '#ffd700'; }
              if (isCorrect) { bg = 'rgba(0,255,136,0.2)';  border = '#00ff88'; textColor = '#00ff88' }
              if (isWrong)   { bg = 'rgba(255,0,110,0.3)';  border = '#ff006e'; textColor = '#ff006e' }

              return (
                <motion.div
                  key={c}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleCellTap(r, c)}
                  className="flex-1 flex items-center justify-center rounded-lg font-orbitron font-black text-base cursor-pointer relative"
                  style={{ aspectRatio: '1', background: bg, border: `2px solid ${border}`, color: textColor, transition: 'all 0.15s' }}
                  animate={isWrong ? { x: [-3,3,-3,3,0] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {/* Number labels */}
                  {c === 0 && (
                    <span className="absolute top-0.5 left-1 text-[8px] font-orbitron text-gray-500">{r + 1}</span>
                  )}
                  {isDown && r === 0 && c !== 0 && (
                    <span className="absolute top-0.5 left-1 text-[8px] font-orbitron text-gray-500">D</span>
                  )}
                  {letter}
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Active clue */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeCell?.r}-${activeCell?.c}-${activeDir}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="glass-card rounded-xl px-4 py-3 mb-4 mx-auto w-full max-w-xs"
          style={{ border: '1px solid rgba(255,215,0,0.3)' }}
        >
          <p className="font-orbitron text-[10px] text-arcade-gold tracking-widest mb-1">
            {activeDir === 'across'
              ? `${(activeCell?.r ?? 0) + 1} ACROSS`
              : 'D DOWN'}
          </p>
          <p className="font-rajdhani text-white text-sm leading-snug">{getActiveClue()}</p>
        </motion.div>
      </AnimatePresence>

      {/* Words done tracker */}
      <div className="flex justify-center gap-1 mb-3">
        {puzzle.across.map((_, i) => (
          <div key={i} className="w-6 h-1.5 rounded-full"
            style={{ background: doneWords.has(`across-${i}`) ? '#ffd700' : 'rgba(255,255,255,0.1)' }} />
        ))}
        <div className="w-1" />
        <div className="w-6 h-1.5 rounded-full"
          style={{ background: doneWords.has('down-0') ? '#00ff88' : 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Keyboard */}
      <div className="flex flex-col items-center gap-1">
        {KEYBOARD.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map(key => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.88 }}
                onClick={() => handleLetter(key)}
                className="rounded-lg font-orbitron font-bold transition-all"
                style={{
                  background: key === '✓' ? 'rgba(0,255,136,0.15)' : key === '⌫' ? 'rgba(255,0,110,0.15)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${key === '✓' ? 'rgba(0,255,136,0.4)' : key === '⌫' ? 'rgba(255,0,110,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: key === '✓' ? '#00ff88' : key === '⌫' ? '#ff006e' : '#ccc',
                  minWidth: key.length > 1 ? 38 : 30,
                  height: 38,
                  fontSize: 11,
                }}
              >
                {key}
              </motion.button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
