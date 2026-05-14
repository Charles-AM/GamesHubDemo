import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const TOTAL_PIECES  = 10
const GAME_DURATION = 90   // seconds — gives room to complete without being trivial

// Rocket stages — index 0 is the first piece built (bottom), 9 is last (top)
const STAGES = [
  { icon: '🏗', label: 'LAUNCH PAD'  },
  { icon: '🔥', label: 'IGNITER'     },
  { icon: '⚙️', label: 'ENGINE'      },
  { icon: '🛢', label: 'FUEL TANK A' },
  { icon: '🛢', label: 'FUEL TANK B' },
  { icon: '🔩', label: 'STRUTS'      },
  { icon: '🪟', label: 'VIEWPORT'    },
  { icon: '📡', label: 'ANTENNA'     },
  { icon: '💡', label: 'GUIDANCE'    },
  { icon: '🔺', label: 'NOSE CONE'   },
]

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function shuffle(arr)   { return [...arr].sort(() => Math.random() - 0.5) }

function makeQuestion(difficulty = 0) {
  let a, b, op, answer
  const r = Math.random()

  if (difficulty === 0) {
    // Easy: addition / small subtraction
    if (r < 0.55) { a = rand(2, 25); b = rand(2, 25); op = '+'; answer = a + b }
    else           { a = rand(10, 40); b = rand(2, a); op = '−'; answer = a - b }
  } else if (difficulty === 1) {
    // Medium: bigger numbers, intro multiplication
    if (r < 0.35)      { a = rand(25, 90); b = rand(10, 50); op = '+'; answer = a + b }
    else if (r < 0.65) { a = rand(30, 99); b = rand(5, a);   op = '−'; answer = a - b }
    else               { a = rand(2, 9);   b = rand(2, 9);   op = '×'; answer = a * b }
  } else {
    // Hard: multiplication + division
    if (r < 0.55) {
      a = rand(4, 12); b = rand(4, 12); op = '×'; answer = a * b
    } else {
      b = rand(2, 9); answer = rand(2, 12); a = b * answer; op = '÷'
    }
  }

  const wrongs = new Set()
  while (wrongs.size < 3) {
    const spread = Math.max(3, Math.floor(Math.abs(answer) * 0.28))
    const w = answer + (Math.random() > 0.5 ? 1 : -1) * rand(1, spread)
    if (w !== answer && w > 0) wrongs.add(w)
  }

  return { label: `${a}  ${op}  ${b}`, correct: answer, options: shuffle([answer, ...wrongs]) }
}

function getDifficulty(pieces) {
  if (pieces < 3) return 0
  if (pieces < 7) return 1
  return 2
}

// ─── Rocket visual ──────────────────────────────────────────────────────────
function RocketVisual({ built, launching }) {
  return (
    <motion.div
      animate={launching ? { y: -420, opacity: 0, scale: 0.6 } : {}}
      transition={{ duration: 1.5, ease: [0.5, 0, 1, 1] }}
      className="flex flex-col items-center select-none"
      style={{ gap: 2 }}>

      {/* Rocket cap — glows when complete */}
      <motion.div
        animate={{ filter: built === TOTAL_PIECES ? 'drop-shadow(0 0 16px #00f5ff)' : 'none' }}
        style={{ fontSize: 34, lineHeight: 1, marginBottom: 2 }}>
        🚀
      </motion.div>

      {/* Pieces rendered top→bottom in JSX so they stack correctly */}
      {[...STAGES].reverse().map((stage, ri) => {
        const idx    = TOTAL_PIECES - 1 - ri   // 9 (top) → 0 (bottom)
        const isBuilt = idx < built
        // Taper: widest at bottom (idx=0), narrowest at top (idx=9)
        const w = 72 - idx * 4                  // 72px → 36px

        return (
          <motion.div key={idx}
            initial={false}
            animate={isBuilt
              ? { opacity: 1, scaleX: 1, boxShadow: '0 0 10px rgba(0,245,255,0.45)' }
              : { opacity: 0.16, scaleX: 0.8,  boxShadow: 'none' }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 240, damping: 20 }}
            style={{
              width: w,
              height: 14,
              borderRadius: 3,
              background: isBuilt ? 'rgba(0,245,255,0.18)' : 'rgba(255,255,255,0.04)',
              border:      `1px solid ${isBuilt ? '#00f5ff' : 'rgba(255,255,255,0.07)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {isBuilt && (
              <span style={{ fontSize: 7, opacity: 0.75 }}>{stage.icon}</span>
            )}
          </motion.div>
        )
      })}

      {/* Launch platform */}
      <div style={{
        width: 86, height: 6, borderRadius: 2, marginTop: 2,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
      }} />

      {/* Launch flame — only when launching */}
      <AnimatePresence>
        {launching && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: [1, 0.6, 1], scaleY: [1, 1.5, 0.8], y: [0, 10, -5] }}
            transition={{ duration: 0.4, repeat: Infinity }}
            style={{ fontSize: 28, marginTop: -4, transformOrigin: 'top' }}>
            🔥
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main game component ─────────────────────────────────────────────────────
export default function MathBlitzGame({ onFinish }) {
  const { updateScore } = useUser()
  const navigate        = useNavigate()

  const [phase,       setPhase]       = useState('playing')  // playing | launch | result
  const [piecesBuilt, setPiecesBuilt] = useState(0)
  const [question,    setQuestion]    = useState(() => makeQuestion(0))
  const [timeLeft,    setTimeLeft]    = useState(GAME_DURATION)
  const [correct,     setCorrect]     = useState(0)
  const [wrong,       setWrong]       = useState(0)
  const [flash,       setFlash]       = useState(null)        // null | 'correct' | 'wrong'
  const [selected,    setSelected]    = useState(null)
  const [launching,   setLaunching]   = useState(false)
  const [lastStage,   setLastStage]   = useState(null)        // name of just-built stage
  const [shake,       setShake]       = useState(false)

  // Refs so async callbacks always see fresh values
  const piecesRef    = useRef(0)
  const correctRef   = useRef(0)
  const wrongRef     = useRef(0)
  const timeLeftRef  = useRef(GAME_DURATION)
  const lockedRef    = useRef(false)
  const finishedRef  = useRef(false)
  const scoreRef     = useRef(0)

  // Countdown
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) {
      if (!finishedRef.current) {
        finishedRef.current = true
        const final = Math.max(0, correctRef.current * 15 - wrongRef.current * 3)
        scoreRef.current = final
        updateScore('mathblitz', final)
        if (onFinish) onFinish(final)
        setPhase('result')
      }
      return
    }
    const t = setTimeout(() => {
      setTimeLeft(prev => {
        const next = prev - 1
        timeLeftRef.current = next
        return next
      })
    }, 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, updateScore, onFinish])

  const handleAnswer = useCallback((opt) => {
    if (lockedRef.current || phase !== 'playing' || finishedRef.current) return
    lockedRef.current = true
    setSelected(opt)

    const isCorrect = opt === question.correct

    if (isCorrect) {
      correctRef.current++
      setCorrect(c => c + 1)
      setFlash('correct')

      const nextPieces = piecesRef.current + 1
      piecesRef.current = nextPieces
      setPiecesBuilt(nextPieces)
      setLastStage(STAGES[nextPieces - 1])

      if (nextPieces >= TOTAL_PIECES) {
        // Rocket complete — launch!
        finishedRef.current = true
        setTimeout(() => {
          const final = Math.max(0, correctRef.current * 15 - wrongRef.current * 3 + timeLeftRef.current * 10)
          scoreRef.current = final
          setLaunching(true)
          setTimeout(() => {
            updateScore('mathblitz', final)
            if (onFinish) onFinish(final)
            setPhase('result')
          }, 1600)
        }, 500)
        return
      }

      setTimeout(() => {
        setFlash(null)
        setSelected(null)
        setLastStage(null)
        setQuestion(makeQuestion(getDifficulty(nextPieces)))
        lockedRef.current = false
      }, 420)

    } else {
      wrongRef.current++
      setWrong(w => w + 1)
      setFlash('wrong')
      setShake(true)
      setTimeout(() => setShake(false), 380)

      setTimeout(() => {
        setFlash(null)
        setSelected(null)
        setQuestion(makeQuestion(getDifficulty(piecesRef.current)))
        lockedRef.current = false
      }, 500)
    }
  }, [phase, question, updateScore, onFinish])

  const timerPct   = timeLeft / GAME_DURATION
  const timerColor = timerPct > 0.4 ? '#00f5ff' : timerPct > 0.2 ? '#ffd700' : '#ff006e'
  const difficulty = getDifficulty(piecesBuilt)
  const diffLabel  = ['EASY', 'MEDIUM', 'HARD'][difficulty]
  const diffColor  = ['#00ff88', '#ffd700', '#ff006e'][difficulty]

  if (phase === 'result') {
    const completed = piecesRef.current >= TOTAL_PIECES
    return (
      <ResultScreen
        game="MATH BLITZ"
        score={scoreRef.current}
        color="cyan"
        stats={[
          { label: 'BUILT',    value: `${piecesRef.current}/${TOTAL_PIECES} 🚀` },
          { label: 'CORRECT',  value: correctRef.current },
          { label: 'ACCURACY', value: correctRef.current + wrongRef.current > 0
              ? `${Math.round((correctRef.current / (correctRef.current + wrongRef.current)) * 100)}%`
              : '—' },
        ]}
        onPlayAgain={() => window.location.reload()}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <motion.div
      animate={shake ? { x: [0, -9, 9, -6, 6, -3, 3, 0] } : {}}
      transition={{ duration: 0.36 }}
      className="min-h-screen flex flex-col px-4 pt-3 pb-6 relative overflow-hidden">

      {/* Full-screen flash */}
      <AnimatePresence>
        {flash && (
          <motion.div key={flash}
            initial={{ opacity: 0.5 }} animate={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
            className="fixed inset-0 pointer-events-none z-20"
            style={{ background: flash === 'correct' ? 'rgba(0,255,136,0.13)' : 'rgba(255,0,110,0.13)' }} />
        )}
      </AnimatePresence>

      {/* Timer bar */}
      <div className="relative z-10 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-orbitron text-xs font-black" style={{ color: timerColor }}>
            {timeLeft}s
          </span>
          <span className="font-orbitron text-[9px] tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${diffColor}18`, color: diffColor, border: `1px solid ${diffColor}44` }}>
            {diffLabel}
          </span>
          <span className="font-orbitron text-xs font-black" style={{ color: '#00f5ff' }}>
            {piecesBuilt}/{TOTAL_PIECES} 🚀
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div className="h-full rounded-full"
            animate={{ width: `${timerPct * 100}%` }}
            style={{ background: timerColor }}
            transition={{ duration: 0.9 }} />
        </div>
      </div>

      {/* Rocket + stage label */}
      <div className="relative z-10 flex flex-col items-center mb-3">
        <RocketVisual built={piecesBuilt} launching={launching} />

        <div className="mt-2 h-5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {launching ? (
              <motion.p key="launch"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1.15 }}
                className="font-orbitron text-base font-black neon-text-cyan tracking-widest">
                🚀 LIFTOFF!
              </motion.p>
            ) : lastStage ? (
              <motion.p key={lastStage.label}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="font-orbitron text-[10px] tracking-widest"
                style={{ color: '#00ff88' }}>
                ✓ {lastStage.icon} {lastStage.label} INSTALLED
              </motion.p>
            ) : (
              <motion.p key="hint"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="font-orbitron text-[9px] text-gray-700 tracking-widest">
                {piecesBuilt === 0 ? 'ANSWER CORRECTLY TO BUILD' : `${TOTAL_PIECES - piecesBuilt} PIECES TO GO`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Question + answers */}
      {!launching && (
        <AnimatePresence mode="wait">
          <motion.div key={question.label + piecesBuilt}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.18 }}
            className="relative z-10 flex flex-col">

            <div className="rounded-2xl px-6 py-5 mb-3 text-center"
              style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.18)' }}>
              <p className="font-orbitron text-4xl font-black text-white tracking-widest">
                {question.label}
              </p>
              <p className="font-orbitron text-sm text-gray-600 mt-1">= ?</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {question.options.map((opt, i) => {
                const isSel    = opt === selected
                const isRight  = opt === question.correct
                let bg = 'rgba(255,255,255,0.04)', border = 'rgba(255,255,255,0.10)', color = '#bbb'
                if (isSel && flash === 'correct') { bg = 'rgba(0,255,136,0.18)'; border = '#00ff88'; color = '#00ff88' }
                if (isSel && flash === 'wrong')   { bg = 'rgba(255,0,110,0.18)'; border = '#ff006e'; color = '#ff006e' }
                if (!isSel && flash === 'wrong' && isRight) { bg = 'rgba(0,255,136,0.10)'; border = '#00ff88'; color = '#00ff88' }
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

            {/* Live stats */}
            <div className="flex justify-center gap-8 mt-4">
              <div className="text-center">
                <p className="font-orbitron text-base font-black" style={{ color: '#00ff88' }}>{correct}</p>
                <p className="font-rajdhani text-[9px] text-gray-600">CORRECT</p>
              </div>
              <div className="text-center">
                <p className="font-orbitron text-base font-black" style={{ color: '#ff006e' }}>{wrong}</p>
                <p className="font-rajdhani text-[9px] text-gray-600">WRONG</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
