import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'
import { COUNTRIES, POINTS } from './countries'

const TIMER     = 12
const ROUNDS    = 10
const MAX_SKIPS = 2

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function buildRound(country, all) {
  const wrong = shuffle(all.filter(c => c.name !== country.name && c.difficulty === country.difficulty))
  const fallback = all.filter(c => c.name !== country.name && c.difficulty !== country.difficulty)
  const pool = [...wrong, ...fallback]
  return { country, options: shuffle([country, ...pool.slice(0, 3)]) }
}

function buildQuestions() {
  const easy   = shuffle(COUNTRIES.filter(c => c.difficulty === 'easy')).slice(0, 4)
  const medium = shuffle(COUNTRIES.filter(c => c.difficulty === 'medium')).slice(0, 4)
  const hard   = shuffle(COUNTRIES.filter(c => c.difficulty === 'hard')).slice(0, 2)
  return shuffle([...easy, ...medium, ...hard]).map(c => buildRound(c, COUNTRIES))
}

export default function FlagGame({ onFinish }) {
  const [questions, setQuestions] = useState([])
  const [current, setCurrent]     = useState(0)
  const [selected, setSelected]   = useState(null)
  const [score, setScore]         = useState(0)
  const [timeLeft, setTimeLeft]   = useState(TIMER)
  const [skipsLeft, setSkipsLeft] = useState(MAX_SKIPS)
  const [answers, setAnswers]     = useState([])
  const [phase, setPhase]         = useState('playing')
  const [popText, setPopText]     = useState(null)
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
    setSkipsLeft(MAX_SKIPS)
    setTimeLeft(TIMER)
    setPhase('playing')
    setPopText(null)
  }, [])

  useEffect(() => { startGame() }, [startGame])

  const advance = useCallback((record) => {
    setAnswers(prev => {
      const next = [...prev, record]
      if (next.length >= ROUNDS) {
        updateScore('flags', scoreRef.current)
        if (onFinish) onFinish(scoreRef.current)
        else setTimeout(() => setPhase('result'), 100)
        return next
      }
      setCurrent(c => c + 1)
      setSelected(null)
      setTimeLeft(TIMER)
      setPhase('playing')
      return next
    })
  }, [updateScore, onFinish])

  const handleAnswer = useCallback((option) => {
    if (phase !== 'playing' || selected !== null) return
    const q = questions[current]
    const isCorrect = option.name === q.country.name
    const pts = isCorrect ? POINTS[q.country.difficulty] + Math.floor(timeLeft * 2) : 0
    scoreRef.current += pts
    setScore(scoreRef.current)
    setSelected(option)
    setPhase('reveal')
    if (pts > 0) setPopText(`+${pts}`)
    setTimeout(() => { setPopText(null); advance({ correct: isCorrect, pts, skipped: false }) }, 1600)
  }, [phase, selected, questions, current, timeLeft, advance])

  const handleSkip = useCallback(() => {
    if (phase !== 'playing' || skipsLeft <= 0) return
    setSkipsLeft(s => s - 1)
    setSelected({ name: '__skip__' })
    setPhase('reveal')
    setTimeout(() => advance({ correct: false, pts: 0, skipped: true }), 1500)
  }, [phase, skipsLeft, advance])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft === 0) { handleAnswer({ name: '__timeout__' }); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, handleAnswer])

  if (phase === 'result' || (answers.length >= ROUNDS && !onFinish)) {
    const correct = answers.filter(a => a.correct).length
    const skipped = answers.filter(a => a.skipped).length
    return (
      <ResultScreen
        game="FLAG FRENZY"
        score={score}
        stats={[
          { label: 'CORRECT', value: `${correct}/${ROUNDS}` },
          { label: 'ACCURACY', value: `${Math.round((correct / ROUNDS) * 100)}%` },
          { label: 'SKIPPED', value: skipped },
        ]}
        onPlayAgain={startGame}
        onHub={() => navigate('/hub')}
        color="purple"
      />
    )
  }

  const q = questions[current]
  if (!q) return null

  const timerPct   = (timeLeft / TIMER) * 100
  const timerColor = timeLeft > 7 ? '#00ff88' : timeLeft > 3 ? '#ffd700' : '#ff006e'
  const isReveal   = phase === 'reveal'

  const diffStyle = {
    easy:   { color: '#00ff88', bg: 'rgba(0,255,136,0.12)' },
    medium: { color: '#ffd700', bg: 'rgba(255,215,0,0.12)'  },
    hard:   { color: '#ff006e', bg: 'rgba(255,0,110,0.12)'  },
  }[q.country.difficulty]

  return (
    <div className="page px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate('/hub')} className="font-orbitron text-xs text-gray-600 hover:text-gray-400">← HUB</button>
        <span className="font-orbitron text-xs neon-text-purple tracking-widest">FLAG FRENZY</span>
        <span className="font-orbitron text-xs text-gray-500">{current + 1}/{ROUNDS}</span>
      </div>

      {/* Progress */}
      <div className="h-1 bg-gray-800 rounded-full mb-4 overflow-hidden">
        <motion.div className="h-full rounded-full bg-arcade-purple"
          animate={{ width: `${(current / ROUNDS) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>

      {/* Skips + Timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_SKIPS }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{ background: i < skipsLeft ? '#ffd700' : 'rgba(255,255,255,0.1)' }} />
          ))}
          <span className="font-rajdhani text-xs text-gray-500 ml-1">SKIPS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: timerColor }}
              animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
          </div>
          <span className="font-orbitron text-sm font-black w-5 text-right" style={{ color: timerColor }}>{timeLeft}</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-center mb-3 relative h-8 flex items-center justify-center">
        <span className="font-rajdhani text-gray-600 text-xs tracking-widest mr-2">SCORE</span>
        <span className="font-orbitron text-xl font-black neon-text-purple">{score}</span>
        <AnimatePresence>
          {popText && (
            <motion.span className="score-pop neon-text-green absolute"
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: [0,1,1,0], y: -40, scale: [0.5,1.3,1] }}
              transition={{ duration: 1.2 }}>
              {popText}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Difficulty badge */}
      <div className="flex justify-center mb-4">
        <span className="font-rajdhani text-xs px-3 py-0.5 rounded-full font-bold"
          style={{ background: diffStyle.bg, color: diffStyle.color }}>
          {q.country.difficulty.toUpperCase()}
        </span>
      </div>

      {/* Flag */}
      <AnimatePresence mode="wait">
        <motion.div key={current}
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.3 }}
          className="flex flex-col items-center flex-1"
        >
          <motion.div
            animate={!isReveal ? { scale: [1, 1.04, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="glass-card rounded-3xl flex items-center justify-center mb-4"
            style={{
              width: '100%', maxWidth: 220, aspectRatio: '4/3', fontSize: 88,
              border: '1px solid rgba(191,0,255,0.35)',
              boxShadow: '0 0 40px rgba(191,0,255,0.15)',
              margin: '0 auto',
            }}
          >
            {q.country.flag}
          </motion.div>

          <p className="font-orbitron text-xs text-gray-500 tracking-widest mb-4">
            WHICH COUNTRY IS THIS? 🌍
          </p>

          {/* Answer reveal banner */}
          <AnimatePresence>
            {isReveal && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-4 py-2.5 text-center mb-4 w-full max-w-xs"
                style={{
                  background: selected?.name === q.country.name ? 'rgba(0,255,136,0.12)' : 'rgba(255,0,110,0.12)',
                  border: `1px solid ${selected?.name === q.country.name ? '#00ff88' : '#ff006e'}`,
                }}>
                {selected?.name === '__skip__' ? (
                  <p className="font-orbitron text-xs text-arcade-gold">SKIPPED · <span className="text-white">{q.country.flag} {q.country.name}</span></p>
                ) : selected?.name === '__timeout__' ? (
                  <p className="font-orbitron text-xs text-arcade-pink">TIME UP · <span className="text-white">{q.country.flag} {q.country.name}</span></p>
                ) : selected?.name === q.country.name ? (
                  <p className="font-orbitron text-xs text-arcade-green">✓ CORRECT! {q.country.flag}</p>
                ) : (
                  <p className="font-orbitron text-xs text-arcade-pink">✗ It was <span className="text-white">{q.country.flag} {q.country.name}</span></p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs">
            {q.options.map((opt, i) => {
              const isCorrect  = opt.name === q.country.name
              const isSelected = selected?.name === opt.name
              let bg = 'rgba(255,255,255,0.04)', border = 'rgba(191,0,255,0.3)', color = '#ccc'
              if (isReveal) {
                if (isCorrect)       { bg = 'rgba(0,255,136,0.2)'; border = '#00ff88'; color = '#00ff88' }
                else if (isSelected) { bg = 'rgba(255,0,110,0.2)'; border = '#ff006e'; color = '#ff006e' }
                else                 { bg = 'rgba(255,255,255,0.02)'; border = 'rgba(255,255,255,0.06)'; color = '#333' }
              }
              return (
                <motion.button key={i} whileTap={{ scale: isReveal ? 1 : 0.95 }}
                  onClick={() => handleAnswer(opt)} disabled={isReveal}
                  className="rounded-2xl px-3 py-3 font-rajdhani font-bold text-sm text-center transition-all duration-250"
                  style={{ background: bg, border: `1px solid ${border}`, color, minHeight: 52 }}>
                  {opt.name}
                </motion.button>
              )
            })}
          </div>

          {/* Skip */}
          {!isReveal && (
            <button onClick={handleSkip} disabled={skipsLeft <= 0}
              className="mt-4 font-orbitron text-xs tracking-widest px-6 py-2 rounded-full transition-all"
              style={{
                background: skipsLeft > 0 ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${skipsLeft > 0 ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: skipsLeft > 0 ? '#ffd700' : '#333',
              }}>
              SKIP ({skipsLeft})
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
