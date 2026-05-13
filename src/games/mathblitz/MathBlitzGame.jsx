import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const GAME_DURATION = 60  // seconds
const PTS_CORRECT   = 10
const PTS_WRONG     = -3

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function shuffle(arr)   { return [...arr].sort(() => Math.random() - 0.5) }

function makeQuestion() {
  const tier = Math.random()
  let a, b, op, answer

  if (tier < 0.4) {
    // Addition
    a = rand(1, 50); b = rand(1, 50); op = '+'
    answer = a + b
  } else if (tier < 0.7) {
    // Subtraction (always positive result)
    a = rand(10, 99); b = rand(1, a); op = '−'
    answer = a - b
  } else {
    // Multiplication (small tables)
    a = rand(2, 12); b = rand(2, 12); op = '×'
    answer = a * b
  }

  // Generate 3 plausible wrong answers
  const wrongs = new Set()
  while (wrongs.size < 3) {
    const offset = rand(1, Math.max(5, Math.floor(answer * 0.3)))
    const w = Math.random() > 0.5 ? answer + offset : answer - offset
    if (w !== answer && w >= 0) wrongs.add(w)
  }

  return {
    label: `${a}  ${op}  ${b}`,
    correct: answer,
    options: shuffle([answer, ...wrongs]),
  }
}

export default function MathBlitzGame({ onFinish }) {
  const { updateScore } = useUser()
  const navigate        = useNavigate()

  const [phase,     setPhase]     = useState('playing')
  const [question,  setQuestion]  = useState(makeQuestion)
  const [timeLeft,  setTimeLeft]  = useState(GAME_DURATION)
  const [score,     setScore]     = useState(0)
  const [correct,   setCorrect]   = useState(0)
  const [wrong,     setWrong]     = useState(0)
  const [flash,     setFlash]     = useState(null) // null | 'correct' | 'wrong'
  const [selected,  setSelected]  = useState(null)

  const scoreRef  = useRef(0)
  const lockedRef = useRef(false)

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) { setPhase('result'); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  const handleAnswer = useCallback((opt) => {
    if (lockedRef.current || phase !== 'playing') return
    lockedRef.current = true
    setSelected(opt)

    const isCorrect = opt === question.correct
    const delta     = isCorrect ? PTS_CORRECT : PTS_WRONG
    const newScore  = Math.max(0, scoreRef.current + delta)
    scoreRef.current = newScore
    setScore(newScore)
    if (isCorrect) setCorrect(c => c + 1)
    else           setWrong(w => w + 1)
    setFlash(isCorrect ? 'correct' : 'wrong')

    setTimeout(() => {
      setFlash(null)
      setSelected(null)
      setQuestion(makeQuestion())
      lockedRef.current = false
    }, 350)
  }, [phase, question])

  // Game over
  useEffect(() => {
    if (phase !== 'result') return
    updateScore('mathblitz', scoreRef.current)
    if (onFinish) onFinish(scoreRef.current)
  }, [phase, updateScore, onFinish])

  const timerPct   = timeLeft / GAME_DURATION
  const timerColor = timerPct > 0.4 ? '#00f5ff' : timerPct > 0.2 ? '#ffd700' : '#ff006e'

  if (phase === 'result') {
    return (
      <ResultScreen
        game="MATH BLITZ"
        score={scoreRef.current}
        color="cyan"
        stats={[
          { label: 'CORRECT', value: correct },
          { label: 'WRONG',   value: wrong   },
          { label: 'ACCURACY', value: correct + wrong > 0 ? `${Math.round((correct / (correct + wrong)) * 100)}%` : '—' },
        ]}
        onPlayAgain={() => { window.location.reload() }}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 relative overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <button onClick={() => navigate('/hub')}
          className="font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
          ← HUB
        </button>
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="font-orbitron text-[10px] text-gray-500 tracking-widest">⚡ MATH BLITZ</span>
      </div>

      {/* Timer bar + score */}
      <div className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-orbitron text-xs font-black" style={{ color: timerColor }}>
            {timeLeft}s
          </span>
          <span className="font-orbitron text-xs font-black" style={{ color: '#00f5ff' }}>
            {score} PTS
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: timerColor, width: `${timerPct * 100}%` }}
            transition={{ duration: 0.5 }} />
        </div>
      </div>

      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div key={flash}
            initial={{ opacity: 0.5 }} animate={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 pointer-events-none z-20"
            style={{ background: flash === 'correct' ? 'rgba(0,255,136,0.12)' : 'rgba(255,0,110,0.12)' }} />
        )}
      </AnimatePresence>

      {/* Stats row */}
      <div className="flex justify-center gap-8 mb-6 relative z-10">
        <div className="text-center">
          <p className="font-orbitron text-xl font-black" style={{ color: '#00ff88' }}>{correct}</p>
          <p className="font-rajdhani text-[10px] text-gray-600">CORRECT</p>
        </div>
        <div className="text-center">
          <p className="font-orbitron text-xl font-black" style={{ color: '#ff006e' }}>{wrong}</p>
          <p className="font-rajdhani text-[10px] text-gray-600">WRONG</p>
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={question.label}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
          className="relative z-10 flex-1 flex flex-col items-center justify-center">

          <div className="rounded-3xl px-10 py-8 mb-8 text-center w-full max-w-xs"
            style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)' }}>
            <p className="font-orbitron text-5xl font-black text-white tracking-widest">
              {question.label}
            </p>
            <p className="font-orbitron text-lg text-gray-600 mt-2">= ?</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {question.options.map((opt, i) => {
              const isCorrect = opt === question.correct
              const isSel     = opt === selected
              let bg     = 'rgba(255,255,255,0.04)'
              let border = 'rgba(255,255,255,0.12)'
              let color  = '#ccc'
              if (isSel && flash === 'correct') { bg = 'rgba(0,255,136,0.18)'; border = '#00ff88'; color = '#00ff88' }
              if (isSel && flash === 'wrong')   { bg = 'rgba(255,0,110,0.18)'; border = '#ff006e'; color = '#ff006e' }
              if (!isSel && flash === 'wrong' && isCorrect) { bg = 'rgba(0,255,136,0.1)'; border = '#00ff88'; color = '#00ff88' }

              return (
                <motion.button key={i}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleAnswer(opt)}
                  disabled={!!selected}
                  className="py-5 rounded-2xl font-orbitron text-2xl font-black transition-all"
                  style={{ background: bg, border: `1px solid ${border}`, color }}>
                  {opt}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
