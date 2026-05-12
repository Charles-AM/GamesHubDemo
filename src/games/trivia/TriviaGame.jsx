import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const TIMER = 15
const POINTS = { easy: 10, medium: 20, hard: 30 }
const CATEGORIES = [9, 11, 12, 14, 15, 17, 18, 20, 21, 22, 23, 25, 26, 27]

function decodeHTML(html) {
  const el = document.createElement('textarea')
  el.innerHTML = html
  return el.value
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

async function fetchQuestions() {
  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
  const url = `https://opentdb.com/api.php?amount=10&type=multiple&category=${cat}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.response_code !== 0) throw new Error('Bad response')
  return data.results.map(q => ({
    question: decodeHTML(q.question),
    correct: decodeHTML(q.correct_answer),
    options: shuffle([q.correct_answer, ...q.incorrect_answers].map(decodeHTML)),
    category: q.category,
    difficulty: q.difficulty,
  }))
}

export default function TriviaGame() {
  const [phase, setPhase] = useState('loading')
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [scoreRef, setScoreRef] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER)
  const [answers, setAnswers] = useState([])
  const { updateScore } = useUser()
  const navigate = useNavigate()

  const loadGame = useCallback(async () => {
    setPhase('loading')
    setScore(0)
    setScoreRef(0)
    setCurrent(0)
    setSelected(null)
    setAnswers([])
    try {
      const qs = await fetchQuestions()
      setQuestions(qs)
      setPhase('playing')
      setTimeLeft(TIMER)
    } catch {
      try {
        const res = await fetch('https://opentdb.com/api.php?amount=10&type=multiple')
        const data = await res.json()
        const qs = data.results.map(q => ({
          question: decodeHTML(q.question),
          correct: decodeHTML(q.correct_answer),
          options: shuffle([q.correct_answer, ...q.incorrect_answers].map(decodeHTML)),
          category: q.category,
          difficulty: q.difficulty,
        }))
        setQuestions(qs)
        setPhase('playing')
        setTimeLeft(TIMER)
      } catch {
        setPhase('error')
      }
    }
  }, [])

  useEffect(() => { loadGame() }, [loadGame])

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || selected !== null) return
    if (timeLeft === 0) { handleAnswer(null); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, selected])

  const handleAnswer = (option) => {
    if (selected !== null) return
    setSelected(option)
    const q = questions[current]
    const isCorrect = option === q.correct
    const pts = isCorrect ? (POINTS[q.difficulty] || 10) + Math.floor(timeLeft * 1.5) : 0
    const newScore = scoreRef + pts
    setScore(newScore)
    setScoreRef(newScore)
    setAnswers(a => [...a, isCorrect])

    setTimeout(() => {
      if (current + 1 >= questions.length) {
        updateScore('trivia', newScore)
        setPhase('result')
      } else {
        setCurrent(c => c + 1)
        setSelected(null)
        setTimeLeft(TIMER)
      }
    }, 1200)
  }

  if (phase === 'loading') return <Loader />
  if (phase === 'error') return <ErrorScreen onRetry={loadGame} onHub={() => navigate('/hub')} />

  if (phase === 'result') {
    const correct = answers.filter(Boolean).length
    return (
      <ResultScreen
        game="TRIVIA QUIZ"
        score={score}
        stats={[
          { label: 'CORRECT', value: `${correct}/10` },
          { label: 'ACCURACY', value: `${Math.round((correct / 10) * 100)}%` },
        ]}
        onPlayAgain={loadGame}
        onHub={() => navigate('/hub')}
        color="cyan"
      />
    )
  }

  const q = questions[current]
  const timerPct = (timeLeft / TIMER) * 100
  const timerColor = timeLeft > 8 ? 'bg-arcade-green' : timeLeft > 4 ? 'bg-arcade-gold' : 'bg-arcade-pink'
  const timerText = timeLeft > 8 ? 'neon-text-green' : timeLeft > 4 ? 'neon-text-gold' : 'neon-text-pink'

  return (
    <div className="min-h-screen px-4 pt-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/hub')} className="font-orbitron text-xs text-gray-600 hover:text-gray-400 transition-colors">
          ← HUB
        </button>
        <span className="font-orbitron text-xs neon-text-cyan tracking-widest">TRIVIA QUIZ</span>
        <span className="font-orbitron text-xs text-gray-500">{current + 1} / 10</span>
      </div>

      {/* Progress */}
      <div className="h-1 bg-gray-800 rounded-full mb-5">
        <motion.div
          className="h-full bg-arcade-cyan rounded-full"
          animate={{ width: `${(current / 10) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-rajdhani px-2 py-0.5 rounded uppercase tracking-wider
            ${q.difficulty === 'easy' ? 'text-arcade-green bg-arcade-green/10' :
              q.difficulty === 'medium' ? 'text-arcade-gold bg-arcade-gold/10' :
              'text-arcade-pink bg-arcade-pink/10'}`}>
            {q.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${timerColor}`}
              animate={{ width: `${timerPct}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
          <span className={`font-orbitron text-sm font-bold w-5 text-right ${timerText}`}>{timeLeft}</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-center mb-5">
        <span className="font-rajdhani text-gray-600 text-xs tracking-widest">SCORE  </span>
        <span className="font-orbitron text-xl font-bold neon-text-cyan">{score}</span>
      </div>

      {/* Question + Options */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
        >
          <div className="glass-card neon-border-cyan rounded-2xl p-5 mb-5">
            <p className="font-rajdhani text-white text-base leading-relaxed text-center">{q.question}</p>
          </div>

          <div className="flex flex-col gap-3">
            {q.options.map((opt, i) => {
              let cls = 'border border-gray-700 text-gray-300 hover:border-gray-500'
              if (selected !== null) {
                if (opt === q.correct) cls = 'neon-border-green text-arcade-green bg-arcade-green/10'
                else if (opt === selected) cls = 'neon-border-pink text-arcade-pink bg-arcade-pink/10'
                else cls = 'border border-gray-800 text-gray-700'
              }
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: selected ? 1 : 0.97 }}
                  onClick={() => handleAnswer(opt)}
                  disabled={selected !== null}
                  className={`glass-card rounded-xl px-4 py-3 font-rajdhani text-sm text-left
                             transition-all duration-300 ${cls}`}
                >
                  <span className="font-orbitron text-xs text-gray-600 mr-3">
                    {['A', 'B', 'C', 'D'][i]}
                  </span>
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

function Loader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-arcade-cyan border-t-transparent rounded-full"
      />
      <p className="font-orbitron text-xs neon-text-cyan tracking-widest">LOADING QUESTIONS...</p>
    </div>
  )
}

function ErrorScreen({ onRetry, onHub }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <p className="font-orbitron text-sm neon-text-pink text-center">FAILED TO LOAD</p>
      <p className="font-rajdhani text-gray-500 text-sm text-center">Check your internet connection</p>
      <div className="flex gap-3">
        <button onClick={onRetry} className="font-orbitron text-xs neon-text-cyan neon-border-cyan px-5 py-2 rounded-lg glass-card">
          RETRY
        </button>
        <button onClick={onHub} className="font-orbitron text-xs text-gray-500 border border-gray-700 px-5 py-2 rounded-lg">
          HUB
        </button>
      </div>
    </div>
  )
}
