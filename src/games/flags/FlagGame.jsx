import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'
import { COUNTRIES, POINTS } from './countries'

const TIMER = 12
const ROUNDS = 10

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function buildRound(country, allCountries) {
  // Pick 3 wrong options — prefer same difficulty for fairness
  const sameDiff = allCountries.filter(c => c.name !== country.name && c.difficulty === country.difficulty)
  const otherDiff = allCountries.filter(c => c.name !== country.name && c.difficulty !== country.difficulty)
  const wrongPool = shuffle([...sameDiff, ...otherDiff])
  const options = shuffle([country, ...wrongPool.slice(0, 3)])
  return { country, options }
}

function buildQuestions() {
  // Mix difficulties: 4 easy, 4 medium, 2 hard
  const easy   = shuffle(COUNTRIES.filter(c => c.difficulty === 'easy')).slice(0, 4)
  const medium = shuffle(COUNTRIES.filter(c => c.difficulty === 'medium')).slice(0, 4)
  const hard   = shuffle(COUNTRIES.filter(c => c.difficulty === 'hard')).slice(0, 2)
  return shuffle([...easy, ...medium, ...hard]).map(c => buildRound(c, COUNTRIES))
}

export default function FlagGame() {
  const [questions, setQuestions] = useState([])
  const [current, setCurrent]     = useState(0)
  const [selected, setSelected]   = useState(null)
  const [score, setScore]         = useState(0)
  const [timeLeft, setTimeLeft]   = useState(TIMER)
  const [answers, setAnswers]     = useState([])
  const [phase, setPhase]         = useState('loading')
  const scoreRef = useRef(0)
  const { updateScore } = useUser()
  const navigate = useNavigate()

  const startGame = useCallback(() => {
    const qs = buildQuestions()
    setQuestions(qs)
    setCurrent(0)
    setSelected(null)
    setScore(0)
    scoreRef.current = 0
    setAnswers([])
    setTimeLeft(TIMER)
    setPhase('playing')
  }, [])

  useEffect(() => { startGame() }, [startGame])

  const handleAnswer = useCallback((option) => {
    if (selected !== null) return
    setSelected(option)

    const q = questions[current]
    const isCorrect = option.name === q.country.name
    const pts = isCorrect ? POINTS[q.country.difficulty] + Math.floor(timeLeft * 2) : 0
    scoreRef.current += pts
    setScore(scoreRef.current)
    setAnswers(a => [...a, isCorrect])

    setTimeout(() => {
      if (current + 1 >= ROUNDS) {
        updateScore('flags', scoreRef.current)
        setPhase('result')
      } else {
        setCurrent(c => c + 1)
        setSelected(null)
        setTimeLeft(TIMER)
      }
    }, 1300)
  }, [selected, questions, current, timeLeft, updateScore])

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || selected !== null) return
    if (timeLeft === 0) { handleAnswer({ name: '' }); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, selected, handleAnswer])

  if (phase === 'loading') return <Loader />

  if (phase === 'result') {
    const correct = answers.filter(Boolean).length
    return (
      <ResultScreen
        game="FLAG FRENZY"
        score={score}
        stats={[
          { label: 'CORRECT', value: `${correct}/${ROUNDS}` },
          { label: 'ACCURACY', value: `${Math.round((correct / ROUNDS) * 100)}%` },
        ]}
        onPlayAgain={startGame}
        onHub={() => navigate('/hub')}
        color="purple"
      />
    )
  }

  const q = questions[current]
  if (!q) return <Loader />

  const timerPct   = (timeLeft / TIMER) * 100
  const timerColor = timeLeft > 7 ? '#00ff88' : timeLeft > 3 ? '#ffd700' : '#ff006e'

  const diffLabel = {
    easy:   { text: 'EASY',   color: '#00ff88', bg: 'rgba(0,255,136,0.12)' },
    medium: { text: 'MEDIUM', color: '#ffd700', bg: 'rgba(255,215,0,0.12)' },
    hard:   { text: 'HARD',   color: '#ff006e', bg: 'rgba(255,0,110,0.12)' },
  }[q.country.difficulty]

  return (
    <div className="min-h-screen flex flex-col px-4 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/hub')} className="font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
          ← HUB
        </button>
        <span className="font-orbitron text-xs neon-text-purple tracking-widest">FLAG FRENZY</span>
        <span className="font-orbitron text-xs text-gray-500">{current + 1} / {ROUNDS}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 rounded-full mb-5 overflow-hidden">
        <motion.div className="h-full rounded-full bg-arcade-purple"
          animate={{ width: `${(current / ROUNDS) * 100}%` }}
          transition={{ duration: 0.4 }} />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mb-6">
        <span className="font-rajdhani text-xs px-3 py-1 rounded-full font-bold"
          style={{ background: diffLabel.bg, color: diffLabel.color }}>
          {diffLabel.text}
        </span>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ background: timerColor }}
              animate={{ width: `${timerPct}%` }}
              transition={{ duration: 1, ease: 'linear' }} />
          </div>
          <span className="font-orbitron text-sm font-black w-5 text-right" style={{ color: timerColor }}>
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="text-center mb-6">
        <span className="font-rajdhani text-gray-600 text-xs tracking-widest">SCORE  </span>
        <span className="font-orbitron text-xl font-black neon-text-purple">{score}</span>
      </div>

      {/* Flag + Question */}
      <AnimatePresence mode="wait">
        <motion.div key={current}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          {/* Flag emoji — big and bold */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="glass-card rounded-3xl flex items-center justify-center mb-4 w-full"
            style={{
              maxWidth: 240,
              aspectRatio: '4/3',
              fontSize: 96,
              border: '1px solid rgba(191,0,255,0.3)',
              boxShadow: '0 0 40px rgba(191,0,255,0.15)',
            }}
          >
            {q.country.flag}
          </motion.div>

          <p className="font-orbitron text-xs text-gray-500 tracking-widest mb-5">
            WHICH COUNTRY IS THIS? 🌍
          </p>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {q.options.map((option, i) => {
              const isCorrect = option.name === q.country.name
              const isSelected = selected?.name === option.name

              let bg = 'rgba(255,255,255,0.04)'
              let border = 'rgba(191,0,255,0.3)'
              let textColor = '#ccc'

              if (selected !== null) {
                if (isCorrect)        { bg = 'rgba(0,255,136,0.2)'; border = '#00ff88'; textColor = '#00ff88' }
                else if (isSelected)  { bg = 'rgba(255,0,110,0.2)'; border = '#ff006e'; textColor = '#ff006e' }
                else                  { bg = 'rgba(255,255,255,0.02)'; border = 'rgba(255,255,255,0.06)'; textColor = '#444' }
              }

              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: selected ? 1 : 0.95 }}
                  onClick={() => handleAnswer(option)}
                  disabled={selected !== null}
                  className="rounded-2xl px-3 py-4 font-rajdhani font-bold text-sm text-center transition-all duration-300"
                  style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
                >
                  {option.name}
                </motion.button>
              )
            })}
          </div>

          {/* Reveal answer name if time runs out */}
          {selected !== null && selected.name === '' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-orbitron text-sm neon-text-gold mt-4"
            >
              ⏱ It was {q.country.name}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Loader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-arcade-purple border-t-transparent rounded-full"
      />
      <p className="font-orbitron text-xs neon-text-purple tracking-widest">LOADING FLAGS...</p>
    </div>
  )
}
