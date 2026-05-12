import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const TIMER   = 15
const ROUNDS  = 10
const MAX_SKIPS = 3
const POINTS  = { easy: 10, medium: 20, hard: 30 }

// Rotate through all categories for variety every game
const CATEGORIES = [9,11,12,14,15,17,18,20,21,22,23,25,26,27]

function decodeHTML(html) {
  const el = document.createElement('textarea')
  el.innerHTML = html
  return el.value
}
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

async function fetchQuestions() {
  // Pick two random categories and merge for more variety
  const cats = shuffle(CATEGORIES).slice(0, 2)
  const results = []
  for (const cat of cats) {
    const res  = await fetch(`https://opentdb.com/api.php?amount=5&type=multiple&category=${cat}`)
    const data = await res.json()
    if (data.response_code === 0) results.push(...data.results)
  }
  if (results.length < ROUNDS) {
    const res  = await fetch(`https://opentdb.com/api.php?amount=${ROUNDS}&type=multiple`)
    const data = await res.json()
    return data.results.map(mapQ)
  }
  return shuffle(results).slice(0, ROUNDS).map(mapQ)
}

function mapQ(q) {
  return {
    question:   decodeHTML(q.question),
    correct:    decodeHTML(q.correct_answer),
    options:    shuffle([q.correct_answer, ...q.incorrect_answers].map(decodeHTML)),
    category:   q.category,
    difficulty: q.difficulty,
  }
}

export default function TriviaGame({ onFinish }) {
  const [phase, setPhase]       = useState('loading') // loading|playing|reveal|result
  const [questions, setQuestions] = useState([])
  const [current, setCurrent]   = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore]       = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER)
  const [skipsLeft, setSkipsLeft] = useState(MAX_SKIPS)
  const [answers, setAnswers]   = useState([])  // {correct, pts, skipped}
  const [popText, setPopText]   = useState(null)
  const scoreRef = useRef(0)
  const { updateScore } = useUser()
  const navigate = useNavigate()

  const startGame = useCallback(async () => {
    setPhase('loading')
    scoreRef.current = 0
    setScore(0)
    setCurrent(0)
    setSelected(null)
    setSkipsLeft(MAX_SKIPS)
    setAnswers([])
    setPopText(null)
    try {
      const qs = await fetchQuestions()
      setQuestions(qs)
      setPhase('playing')
      setTimeLeft(TIMER)
    } catch {
      setPhase('error')
    }
  }, [])

  useEffect(() => { startGame() }, [startGame])

  const advance = useCallback((answerRecord) => {
    setAnswers(prev => {
      const next = [...prev, answerRecord]
      if (next.length >= ROUNDS) {
        updateScore('trivia', scoreRef.current)
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
    const isCorrect = option === q.correct
    const pts = isCorrect ? (POINTS[q.difficulty] || 10) + Math.floor(timeLeft * 1.5) : 0
    scoreRef.current += pts
    setScore(scoreRef.current)
    setSelected(option)
    setPhase('reveal')
    if (pts > 0) setPopText(`+${pts}`)
    setTimeout(() => { setPopText(null); advance({ correct: isCorrect, pts, skipped: false }) }, 1500)
  }, [phase, selected, questions, current, timeLeft, advance])

  const handleSkip = useCallback(() => {
    if (phase !== 'playing' || skipsLeft <= 0) return
    setSkipsLeft(s => s - 1)
    setPhase('reveal')
    setSelected('__skip__')
    setTimeout(() => { advance({ correct: false, pts: 0, skipped: true }) }, 1400)
  }, [phase, skipsLeft, advance])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft === 0) { handleAnswer('__timeout__'); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, handleAnswer])

  // ── Render ──────────────────────────────────────
  if (phase === 'loading') return <Loader color="#00f5ff" label="FETCHING QUESTIONS..." />
  if (phase === 'error')   return <ErrorScreen onRetry={startGame} onHub={() => navigate('/hub')} />

  if (phase === 'result' || (answers.length >= ROUNDS && !onFinish)) {
    const correct = answers.filter(a => a.correct).length
    const skipped = answers.filter(a => a.skipped).length
    return (
      <ResultScreen
        game="TRIVIA QUIZ"
        score={score}
        stats={[
          { label: 'CORRECT', value: `${correct}/${ROUNDS}` },
          { label: 'ACCURACY', value: `${Math.round((correct / ROUNDS) * 100)}%` },
          { label: 'SKIPPED', value: skipped },
        ]}
        onPlayAgain={startGame}
        onHub={() => navigate('/hub')}
        color="cyan"
      />
    )
  }

  const q = questions[current]
  if (!q) return <Loader color="#00f5ff" label="LOADING..." />

  const timerPct   = (timeLeft / TIMER) * 100
  const timerColor = timeLeft > 8 ? '#00ff88' : timeLeft > 4 ? '#ffd700' : '#ff006e'
  const isReveal   = phase === 'reveal'

  return (
    <div className="page px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate('/hub')} className="font-orbitron text-xs text-gray-600 hover:text-gray-400">← HUB</button>
        <span className="font-orbitron text-xs neon-text-cyan tracking-widest">TRIVIA</span>
        <span className="font-orbitron text-xs text-gray-500">{current + 1}/{ROUNDS}</span>
      </div>

      {/* Progress */}
      <div className="h-1 bg-gray-800 rounded-full mb-4 overflow-hidden">
        <motion.div className="h-full bg-arcade-cyan rounded-full"
          animate={{ width: `${(current / ROUNDS) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>

      {/* Skips + Timer row */}
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

      {/* Score + pop */}
      <div className="text-center mb-4 relative h-8 flex items-center justify-center">
        <span className="font-rajdhani text-gray-600 text-xs tracking-widest mr-2">SCORE</span>
        <span className="font-orbitron text-xl font-black neon-text-cyan">{score}</span>
        <AnimatePresence>
          {popText && (
            <motion.span
              key={popText + Date.now()}
              className="score-pop neon-text-green absolute"
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: -40, scale: [0.5, 1.3, 1] }}
              transition={{ duration: 1.2 }}
            >
              {popText}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Difficulty badge */}
      <div className="flex justify-center mb-3">
        <span className={`text-[10px] font-rajdhani px-2 py-0.5 rounded-full uppercase tracking-wider
          ${q.difficulty === 'easy'   ? 'text-arcade-green bg-arcade-green/10' :
            q.difficulty === 'medium' ? 'text-arcade-gold  bg-arcade-gold/10'  :
                                        'text-arcade-pink  bg-arcade-pink/10'}`}>
          {q.difficulty} · {q.category.split(':').pop().trim()}
        </span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={current}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col"
        >
          <div className="glass-card neon-border-cyan rounded-2xl p-4 mb-4">
            <p className="font-rajdhani text-white text-base leading-relaxed text-center">{q.question}</p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2 mb-4">
            {q.options.map((opt, i) => {
              let bg = 'rgba(255,255,255,0.04)'
              let border = 'rgba(255,255,255,0.12)'
              let color = '#ccc'
              if (isReveal) {
                if (opt === q.correct)              { bg = 'rgba(0,255,136,0.18)'; border = '#00ff88'; color = '#00ff88' }
                else if (opt === selected)          { bg = 'rgba(255,0,110,0.18)'; border = '#ff006e'; color = '#ff006e' }
                else                               { bg = 'rgba(255,255,255,0.02)'; border = 'rgba(255,255,255,0.05)'; color = '#333' }
              }
              return (
                <motion.button key={i} whileTap={{ scale: isReveal ? 1 : 0.97 }}
                  onClick={() => handleAnswer(opt)} disabled={isReveal}
                  className="rounded-xl px-4 py-3 font-rajdhani text-sm text-left transition-all duration-300 flex items-center gap-3"
                  style={{ background: bg, border: `1px solid ${border}`, color, minHeight: 48 }}
                >
                  <span className="font-orbitron text-xs opacity-50 w-4">{['A','B','C','D'][i]}</span>
                  <span className="flex-1">{opt}</span>
                  {isReveal && opt === q.correct && <span className="text-arcade-green text-lg">✓</span>}
                  {isReveal && opt === selected && opt !== q.correct && <span className="text-arcade-pink text-lg">✗</span>}
                </motion.button>
              )
            })}
          </div>

          {/* Answer reveal banner */}
          <AnimatePresence>
            {isReveal && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-xl px-4 py-2.5 text-center mb-3"
                style={{
                  background: selected === q.correct ? 'rgba(0,255,136,0.12)' : 'rgba(255,0,110,0.12)',
                  border: `1px solid ${selected === q.correct ? '#00ff88' : '#ff006e'}`,
                }}>
                {selected === '__skip__' ? (
                  <p className="font-orbitron text-xs text-arcade-gold">SKIPPED · Answer: <span className="text-white">{q.correct}</span></p>
                ) : selected === '__timeout__' ? (
                  <p className="font-orbitron text-xs text-arcade-pink">TIME UP · Answer: <span className="text-white">{q.correct}</span></p>
                ) : selected === q.correct ? (
                  <p className="font-orbitron text-xs text-arcade-green">✓ CORRECT!</p>
                ) : (
                  <p className="font-orbitron text-xs text-arcade-pink">✗ WRONG · Answer: <span className="text-white">{q.correct}</span></p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip button */}
          {!isReveal && (
            <button onClick={handleSkip} disabled={skipsLeft <= 0}
              className="mx-auto font-orbitron text-xs tracking-widest px-6 py-2 rounded-full transition-all"
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

function Loader({ color, label }) {
  return (
    <div className="page items-center justify-center gap-4">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-t-transparent rounded-full" style={{ borderColor: color, borderTopColor: 'transparent' }} />
      <p className="font-orbitron text-xs tracking-widest" style={{ color }}>{label}</p>
    </div>
  )
}

function ErrorScreen({ onRetry, onHub }) {
  return (
    <div className="page items-center justify-center gap-4 px-6">
      <p className="font-orbitron text-sm neon-text-pink text-center">FAILED TO LOAD</p>
      <p className="font-rajdhani text-gray-500 text-sm text-center">Check your internet connection</p>
      <div className="flex gap-3">
        <button onClick={onRetry} className="font-orbitron text-xs neon-text-cyan neon-border-cyan px-5 py-2 rounded-lg glass-card">RETRY</button>
        <button onClick={onHub}   className="font-orbitron text-xs text-gray-500 border border-gray-700 px-5 py-2 rounded-lg">HUB</button>
      </div>
    </div>
  )
}
