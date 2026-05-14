import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

// ─── Word bank [word, emoji, category] ─────────────────────────────────────
const WORD_BANK = [
  // Easy — 3-4 letters
  ['CAT',  '🐱', 'ANIMAL'],  ['DOG',  '🐶', 'ANIMAL'],
  ['SUN',  '☀️', 'NATURE'],  ['FLY',  '✈️', 'ACTION'],
  ['FOX',  '🦊', 'ANIMAL'],  ['BEE',  '🐝', 'ANIMAL'],
  ['ANT',  '🐜', 'ANIMAL'],  ['ICE',  '🧊', 'NATURE'],
  ['GEM',  '💎', 'OBJECT'],  ['OWL',  '🦉', 'ANIMAL'],
  ['HAT',  '🎩', 'OBJECT'],  ['CUP',  '☕', 'OBJECT'],
  ['BOX',  '📦', 'OBJECT'],  ['SKY',  '🌌', 'NATURE'],
  ['JAM',  '🍓', 'FOOD'],    ['MAP',  '🗺️', 'OBJECT'],
  ['NET',  '🎣', 'OBJECT'],  ['PIG',  '🐷', 'ANIMAL'],
  ['HEN',  '🐔', 'ANIMAL'],  ['FIG',  '🍑', 'FOOD'],

  // Medium — 5-6 letters
  ['TIGER', '🐯', 'ANIMAL'],  ['OCEAN', '🌊', 'NATURE'],
  ['PIZZA', '🍕', 'FOOD'],    ['CLOUD', '☁️', 'WEATHER'],
  ['DREAM', '💭', 'CONCEPT'], ['PLANT', '🌿', 'NATURE'],
  ['GRAPE', '🍇', 'FOOD'],    ['FLAME', '🔥', 'ELEMENT'],
  ['STONE', '🪨', 'NATURE'],  ['HEART', '❤️', 'BODY'],
  ['BEACH', '🏖️', 'PLACE'],  ['MAGIC', '✨', 'CONCEPT'],
  ['APPLE', '🍎', 'FOOD'],    ['HORSE', '🐴', 'ANIMAL'],
  ['BREAD', '🍞', 'FOOD'],    ['LIGHT', '💡', 'SCIENCE'],
  ['MUSIC', '🎵', 'ART'],     ['SWORD', '⚔️', 'OBJECT'],
  ['STORM', '⛈️', 'WEATHER'], ['GLOBE', '🌍', 'OBJECT'],

  // Hard — 7+ letters
  ['PENGUIN', '🐧', 'ANIMAL'],   ['DOLPHIN', '🐬', 'ANIMAL'],
  ['PYRAMID', '🔺', 'PLACE'],   ['VILLAGE', '🏘️', 'PLACE'],
  ['CAPTAIN', '⚓', 'RANK'],    ['BLANKET', '🛏️', 'OBJECT'],
  ['TRUMPET', '🎺', 'MUSIC'],   ['CRYSTAL', '💎', 'OBJECT'],
  ['LANTERN', '🏮', 'OBJECT'],  ['DIAMOND', '💎', 'GEM'],
  ['CHIMNEY', '🏠', 'HOUSE'],   ['KITCHEN', '🍳', 'ROOM'],
  ['VOLCANO', '🌋', 'NATURE'],  ['LEOPARD', '🐆', 'ANIMAL'],
  ['COMPASS', '🧭', 'OBJECT'],  ['LIBRARY', '📚', 'PLACE'],
  ['BALLOON', '🎈', 'OBJECT'],  ['CHICKEN', '🐔', 'ANIMAL'],
  ['THUNDER', '⚡', 'WEATHER'], ['MILLION', '💰', 'NUMBER'],
]

const GAME_DURATION = 90
const TOTAL_STEPS   = 10

// Landmarks along the path (indices 0-8 = steps 1-9, index 9 = home)
const LANDMARKS = ['🌳','⭐','🌻','☁️','🌈','🎪','🌺','⛲','🎠','🏠']

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function blankWord(word, diff) {
  // Fraction of letters to blank: easy ~30%, medium ~45%, hard ~55%
  const frac    = [0.30, 0.45, 0.55][diff]
  const len     = word.length
  const n       = Math.max(1, Math.round(len * frac))
  // Never blank index 0 or last index
  const pool    = Array.from({ length: len - 2 }, (_, i) => i + 1)
  const blanked = new Set(shuffle(pool).slice(0, Math.min(n, pool.length)))
  return word.split('').map((c, i) => blanked.has(i) ? '_' : c).join('')
}

function buildRounds() {
  const easy   = shuffle(WORD_BANK.filter(([w]) => w.length <= 4))
  const medium = shuffle(WORD_BANK.filter(([w]) => w.length === 5 || w.length === 6))
  const hard   = shuffle(WORD_BANK.filter(([w]) => w.length >= 7))

  const chosen = [
    ...easy.slice(0, 3),    // steps 1-3
    ...medium.slice(0, 4),  // steps 4-7
    ...hard.slice(0, 3),    // steps 8-10
  ]

  return chosen.map(([word, icon, cat], i) => {
    const diff = i < 3 ? 0 : i < 7 ? 1 : 2

    // Distractors: same-ish length words
    const distractors = shuffle(
      WORD_BANK.filter(([w]) => w !== word && Math.abs(w.length - word.length) <= 1)
    ).slice(0, 3).map(([w]) => w)

    return {
      word, icon, cat, diff,
      display: blankWord(word, diff),
      options: shuffle([word, ...distractors]),
    }
  })
}

// ─── Path visual ────────────────────────────────────────────────────────────
function JourneyPath({ step }) {
  // Character x% along the path
  const charPct = step === 0 ? 2 : Math.min(96, (step / TOTAL_STEPS) * 94 + 2)

  return (
    <div className="relative w-full select-none" style={{ height: 86 }}>

      {/* Progress fill behind the dots */}
      <div className="absolute" style={{ top: 62, left: '4%', right: '4%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #00f5ff, #00ff88)', originX: 0 }}
          animate={{ scaleX: step / TOTAL_STEPS }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }} />
      </div>

      {/* Landmarks + dots */}
      {LANDMARKS.map((lm, i) => {
        const pct  = ((i + 1) / TOTAL_STEPS) * 88 + 6   // 6% → 94%
        const done = i < step
        const isHome = i === TOTAL_STEPS - 1
        return (
          <div key={i} className="absolute flex flex-col items-center"
            style={{ left: `${pct}%`, top: 0, transform: 'translateX(-50%)' }}>
            <span style={{ fontSize: isHome ? 22 : 14, opacity: done || isHome ? 1 : 0.22, filter: done ? 'none' : 'grayscale(1)' }}>
              {lm}
            </span>
            {!isHome && (
              <div style={{
                width: 8, height: 8, borderRadius: 4, marginTop: 4,
                background: done ? '#00f5ff' : 'rgba(255,255,255,0.14)',
                boxShadow: done ? '0 0 6px #00f5ff' : 'none',
                border: `1px solid ${done ? '#00f5ff' : 'rgba(255,255,255,0.12)'}`,
              }} />
            )}
          </div>
        )
      })}

      {/* Character */}
      <motion.div className="absolute"
        style={{ top: 26, transform: 'translateX(-50%)', fontSize: step === TOTAL_STEPS ? 26 : 22, zIndex: 10, lineHeight: 1 }}
        animate={{ left: `${charPct}%` }}
        transition={{ type: 'spring', stiffness: 70, damping: 16 }}>
        {step === TOTAL_STEPS ? '🎉' : '🏃'}
      </motion.div>

      {/* Start flag */}
      <div className="absolute" style={{ left: '2%', top: 26, transform: 'translateX(-50%)', fontSize: 14, opacity: 0.3 }}>
        🚩
      </div>
    </div>
  )
}

// ─── Main game ───────────────────────────────────────────────────────────────
export default function WordWalkGame({ onFinish }) {
  const { updateScore } = useUser()
  const navigate        = useNavigate()

  const [rounds]     = useState(buildRounds)
  const [step,       setStep]       = useState(0)
  const [roundIdx,   setRoundIdx]   = useState(0)
  const [phase,      setPhase]      = useState('playing') // playing | win | result
  const [timeLeft,   setTimeLeft]   = useState(GAME_DURATION)
  const [correct,    setCorrect]    = useState(0)
  const [wrong,      setWrong]      = useState(0)
  const [flash,      setFlash]      = useState(null)       // 'correct' | 'wrong' | null
  const [selected,   setSelected]   = useState(null)
  const [shake,      setShake]      = useState(false)
  const [showWord,   setShowWord]   = useState(null)       // completed word to flash

  const stepRef    = useRef(0)
  const correctRef = useRef(0)
  const wrongRef   = useRef(0)
  const timeRef    = useRef(GAME_DURATION)
  const lockedRef  = useRef(false)
  const doneRef    = useRef(false)
  const scoreRef   = useRef(0)

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) { finish(); return }
    const t = setTimeout(() => {
      setTimeLeft(prev => { const n = prev - 1; timeRef.current = n; return n })
    }, 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft]) // eslint-disable-line

  const finish = useCallback((won = false) => {
    if (doneRef.current) return
    doneRef.current = true
    const base  = correctRef.current * 15 - wrongRef.current * 3
    const bonus = won ? timeRef.current * 8 : 0
    const final = Math.max(0, base + bonus)
    scoreRef.current = final
    updateScore('wordwalk', final)
    if (onFinish) onFinish(final)
    setPhase(won ? 'win' : 'result')
  }, [updateScore, onFinish])

  const handleAnswer = useCallback((opt) => {
    if (lockedRef.current || phase !== 'playing') return
    lockedRef.current = true
    setSelected(opt)

    const round = rounds[roundIdx]
    const isCorrect = opt === round.word

    if (isCorrect) {
      correctRef.current++
      setCorrect(c => c + 1)
      setFlash('correct')
      setShowWord(round.word)

      const nextStep = stepRef.current + 1
      stepRef.current = nextStep
      setStep(nextStep)

      if (nextStep >= TOTAL_STEPS) {
        setTimeout(() => finish(true), 600)
        return
      }

      setTimeout(() => {
        setFlash(null)
        setSelected(null)
        setShowWord(null)
        setRoundIdx(i => i + 1)
        lockedRef.current = false
      }, 500)
    } else {
      wrongRef.current++
      setWrong(w => w + 1)
      setFlash('wrong')
      setShake(true)
      setTimeout(() => setShake(false), 380)
      setTimeout(() => {
        setFlash(null)
        setSelected(null)
        lockedRef.current = false
      }, 500)
    }
  }, [phase, rounds, roundIdx, finish])

  const round      = rounds[Math.min(roundIdx, rounds.length - 1)]
  const timerPct   = timeLeft / GAME_DURATION
  const timerColor = timerPct > 0.45 ? '#00f5ff' : timerPct > 0.2 ? '#ffd700' : '#ff006e'
  const diffLabel  = ['EASY', 'MEDIUM', 'HARD'][round.diff]
  const diffColor  = ['#00ff88', '#ffd700', '#ff006e'][round.diff]

  // Win screen
  if (phase === 'win') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="orb orb-cyan"   style={{ top: '-5%',  left: '-10%' }} />
          <div className="orb orb-green"  style={{ bottom: '5%', right: '-8%' }} />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120 }}
          className="relative z-10 text-center w-full max-w-xs">
          <motion.div
            animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}
            style={{ fontSize: 64, marginBottom: 16 }}>🏠</motion.div>
          <h2 className="font-orbitron text-2xl font-black neon-text-cyan mb-1">HOME!</h2>
          <p className="font-rajdhani text-sm text-gray-400 mb-6">
            You made it with <span style={{ color: '#ffd700' }}>{timeLeft}s</span> to spare
          </p>
          <div className="glass-card rounded-2xl p-5 mb-4 text-center"
            style={{ border: '1px solid rgba(0,245,255,0.35)' }}>
            <p className="font-rajdhani text-xs text-gray-500 tracking-widest mb-1">FINAL SCORE</p>
            <p className="font-orbitron text-5xl font-black neon-text-cyan">{scoreRef.current}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()}
              className="flex-1 py-3 rounded-xl font-orbitron text-xs tracking-widest"
              style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid #00f5ff', color: '#00f5ff' }}>
              PLAY AGAIN
            </button>
            <button onClick={() => navigate('/hub')}
              className="flex-1 py-3 rounded-xl font-orbitron text-xs tracking-widest"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af' }}>
              HUB
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (phase === 'result') {
    return (
      <ResultScreen
        game="WORD WALK"
        score={scoreRef.current}
        color="cyan"
        stats={[
          { label: 'STEPS',    value: `${stepRef.current}/${TOTAL_STEPS}` },
          { label: 'CORRECT',  value: correctRef.current },
          { label: 'ACCURACY', value: correctRef.current + wrongRef.current > 0
              ? `${Math.round(correctRef.current / (correctRef.current + wrongRef.current) * 100)}%`
              : '—' },
        ]}
        onPlayAgain={() => window.location.reload()}
        onHub={() => navigate('/hub')}
      />
    )
  }

  return (
    <motion.div
      animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}}
      transition={{ duration: 0.34 }}
      className="min-h-screen flex flex-col px-4 pt-3 pb-6 relative overflow-hidden">

      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div key={flash}
            initial={{ opacity: 0.45 }} animate={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
            className="fixed inset-0 pointer-events-none z-20"
            style={{ background: flash === 'correct' ? 'rgba(0,255,136,0.12)' : 'rgba(255,0,110,0.12)' }} />
        )}
      </AnimatePresence>

      {/* Timer bar */}
      <div className="relative z-10 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-orbitron text-xs font-black" style={{ color: timerColor }}>{timeLeft}s</span>
          <span className="font-orbitron text-[9px] tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${diffColor}18`, color: diffColor, border: `1px solid ${diffColor}44` }}>
            {diffLabel}
          </span>
          <span className="font-orbitron text-xs font-black" style={{ color: '#00f5ff' }}>
            {step}/{TOTAL_STEPS} 🏠
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div className="h-full rounded-full"
            animate={{ width: `${timerPct * 100}%` }}
            style={{ background: timerColor }}
            transition={{ duration: 0.9 }} />
        </div>
      </div>

      {/* Journey path */}
      <div className="relative z-10 mb-2 px-1">
        <JourneyPath step={step} />
      </div>

      {/* Correct word flash */}
      <div className="h-6 flex items-center justify-center mb-2 relative z-10">
        <AnimatePresence mode="wait">
          {showWord ? (
            <motion.p key="word"
              initial={{ opacity: 0, y: 6, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="font-orbitron text-sm font-black tracking-widest"
              style={{ color: '#00ff88' }}>
              ✓ {showWord}
            </motion.p>
          ) : (
            <motion.p key="hint" className="font-orbitron text-[9px] text-gray-700 tracking-widest">
              {step === 0 ? 'COMPLETE WORDS TO WALK HOME' : `${TOTAL_STEPS - step} MORE STEP${TOTAL_STEPS - step !== 1 ? 'S' : ''} TO GO`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Word challenge */}
      <AnimatePresence mode="wait">
        <motion.div key={roundIdx}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
          className="relative z-10 flex flex-col flex-1">

          {/* Partial word */}
          <div className="rounded-2xl px-5 py-5 mb-3 text-center"
            style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.18)' }}>
            <p className="font-rajdhani text-[10px] text-gray-600 tracking-widest mb-1">
              {round.icon}  {round.cat}
            </p>
            <p className="font-orbitron text-3xl font-black text-white tracking-[0.25em]">
              {round.display}
            </p>
            <p className="font-rajdhani text-[10px] text-gray-600 mt-1">
              {round.word.length} letters
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-2.5">
            {round.options.map((opt, i) => {
              const isSel   = opt === selected
              const isRight = opt === round.word
              let bg = 'rgba(255,255,255,0.04)', border = 'rgba(255,255,255,0.10)', color = '#bbb'
              if (isSel && flash === 'correct') { bg = 'rgba(0,255,136,0.18)'; border = '#00ff88'; color = '#00ff88' }
              if (isSel && flash === 'wrong')   { bg = 'rgba(255,0,110,0.18)'; border = '#ff006e'; color = '#ff006e' }
              if (!isSel && flash === 'wrong' && isRight) { bg = 'rgba(0,255,136,0.10)'; border = '#00ff88'; color = '#00ff88' }
              return (
                <motion.button key={i}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleAnswer(opt)}
                  disabled={!!selected}
                  className="py-4 rounded-2xl font-orbitron text-base font-black tracking-widest transition-all"
                  style={{ background: bg, border: `1px solid ${border}`, color }}>
                  {opt}
                </motion.button>
              )
            })}
          </div>

          {/* Stats */}
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
    </motion.div>
  )
}
