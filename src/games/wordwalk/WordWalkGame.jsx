import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

// ─── Word bank [word, emoji, category] ──────────────────────────────────────
const WORD_BANK = [
  // 3-letter (rookie-friendly)
  ['CAT','🐱','ANIMAL'],['DOG','🐶','ANIMAL'],['SUN','☀️','NATURE'],
  ['FOX','🦊','ANIMAL'],['BEE','🐝','ANIMAL'],['ANT','🐜','ANIMAL'],
  ['ICE','🧊','NATURE'],['OWL','🦉','ANIMAL'],['HAT','🎩','OBJECT'],
  ['CUP','☕','OBJECT'],['SKY','🌌','NATURE'],['JAM','🍓','FOOD'],
  ['PIG','🐷','ANIMAL'],['HEN','🐔','ANIMAL'],['GEM','💎','OBJECT'],
  ['NET','🎣','OBJECT'],['MAP','🗺️','OBJECT'],['FLY','✈️','VERB'],
  ['ACE','🃏','WORD'],  ['AXE','🪓','OBJECT'],

  // 4-letter
  ['BEAR','🐻','ANIMAL'],['FISH','🐟','ANIMAL'],['FROG','🐸','ANIMAL'],
  ['WOLF','🐺','ANIMAL'],['BIRD','🐦','ANIMAL'],['CAKE','🎂','FOOD'],
  ['RAIN','🌧️','WEATHER'],['STAR','⭐','SPACE'],['MOON','🌙','SPACE'],
  ['BOAT','⛵','OBJECT'],['DRUM','🥁','MUSIC'],['FIRE','🔥','NATURE'],
  ['GOLD','🥇','OBJECT'],['JADE','💚','GEM'],  ['KING','👑','RANK'],
  ['LAMP','💡','OBJECT'],['MINT','🌿','PLANT'],['ROSE','🌹','PLANT'],

  // 5-letter
  ['TIGER','🐯','ANIMAL'],['OCEAN','🌊','NATURE'],['PIZZA','🍕','FOOD'],
  ['CLOUD','☁️','WEATHER'],['DREAM','💭','CONCEPT'],['PLANT','🌿','NATURE'],
  ['GRAPE','🍇','FOOD'],  ['FLAME','🔥','ELEMENT'],['STONE','🪨','NATURE'],
  ['HEART','❤️','BODY'],  ['BEACH','🏖️','PLACE'],['MAGIC','✨','CONCEPT'],
  ['APPLE','🍎','FOOD'],  ['HORSE','🐴','ANIMAL'],['BREAD','🍞','FOOD'],
  ['LIGHT','💡','SCIENCE'],['MUSIC','🎵','ART'],  ['SWORD','⚔️','OBJECT'],
  ['STORM','⛈️','WEATHER'],['GLOBE','🌍','OBJECT'],['SHARK','🦈','ANIMAL'],
  ['CROWN','👑','OBJECT'],['FROST','❄️','WEATHER'],['PRISM','🔮','SCIENCE'],

  // 6-letter
  ['FALCON','🦅','ANIMAL'],['JUNGLE','🌴','NATURE'],['PURPLE','💜','COLOR'],
  ['SILVER','🥈','METAL'], ['ROCKET','🚀','SCIENCE'],['CASTLE','🏰','PLACE'],
  ['BRIDGE','🌉','PLACE'],['WINTER','❄️','SEASON'],['FLOWER','🌸','PLANT'],
  ['DRAGON','🐉','MYTH'],  ['KNIGHT','♞','CHESS'], ['MIRROR','🪞','OBJECT'],
  ['PLANET','🪐','SPACE'], ['SPIDER','🕷️','ANIMAL'],['SUNSET','🌅','NATURE'],

  // 7+ letter (veteran territory)
  ['PENGUIN','🐧','ANIMAL'],  ['DOLPHIN','🐬','ANIMAL'],
  ['PYRAMID','🔺','PLACE'],   ['VILLAGE','🏘️','PLACE'],
  ['CAPTAIN','⚓','RANK'],    ['BLANKET','🛏️','OBJECT'],
  ['TRUMPET','🎺','MUSIC'],   ['CRYSTAL','💎','OBJECT'],
  ['LANTERN','🏮','OBJECT'],  ['DIAMOND','💎','GEM'],
  ['CHIMNEY','🏠','HOUSE'],   ['KITCHEN','🍳','ROOM'],
  ['VOLCANO','🌋','NATURE'],  ['LEOPARD','🐆','ANIMAL'],
  ['COMPASS','🧭','OBJECT'],  ['LIBRARY','📚','PLACE'],
  ['BALLOON','🎈','OBJECT'],  ['CHICKEN','🐔','ANIMAL'],
  ['THUNDER','⚡','WEATHER'], ['MILLION','💰','NUMBER'],
  ['MYSTERY','🔍','CONCEPT'], ['HARMONY','🎵','CONCEPT'],
  ['QUANTUM','⚛️','SCIENCE'], ['ECLIPSE','🌑','SPACE'],
]

// ─── Difficulty config ───────────────────────────────────────────────────────
const DIFF = {
  easy: {
    duration:    120,
    questionSec: 18,
    blankFrac:   [0.15, 0.25, 0.35],   // per word-length tier
    // word-length buckets for each of the 10 steps
    stepLens:    [3,3,4,4,3,4,4,5,5,5],
    bonusPts:    8,     // pts for answering in first-half of question timer
    streakAt:    2,     // consecutive correct to trigger streak
  },
  medium: {
    duration:    90,
    questionSec: 12,
    blankFrac:   [0.30, 0.45, 0.55],
    stepLens:    [3,4,4,5,5,5,6,6,7,7],
    bonusPts:    12,
    streakAt:    3,
  },
  hard: {
    duration:    65,
    questionSec: 8,
    blankFrac:   [0.45, 0.55, 0.65],
    stepLens:    [5,5,6,6,7,7,7,7,8,9],
    bonusPts:    20,
    streakAt:    3,
  },
}

const TOTAL_STEPS = 10
const LANDMARKS   = ['🌳','⭐','🌻','☁️','🌈','🎪','🌺','⛲','🎠','🏠']

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function blankWord(word, frac) {
  const n    = Math.max(1, Math.round(word.length * frac))
  const pool = Array.from({ length: word.length - 2 }, (_, i) => i + 1)
  const bad  = new Set(shuffle(pool).slice(0, Math.min(n, pool.length)))
  return word.split('').map((c, i) => bad.has(i) ? '_' : c).join('')
}

function buildRounds(diff) {
  const cfg = DIFF[diff]
  const rounds = []

  for (let s = 0; s < TOTAL_STEPS; s++) {
    const targetLen = cfg.stepLens[s]
    // Pick a word whose length is close to target
    const pool = shuffle(
      WORD_BANK.filter(([w]) => Math.abs(w.length - targetLen) <= 1)
    )
    const [word, icon, cat] = pool[0] || WORD_BANK[s % WORD_BANK.length]

    // Blank fraction scales with word length (longer = harder tier)
    const tier = word.length <= 4 ? 0 : word.length <= 6 ? 1 : 2
    const frac = cfg.blankFrac[tier]

    // Distractors
    const distractors = shuffle(
      WORD_BANK.filter(([w]) => w !== word && Math.abs(w.length - word.length) <= 1)
    ).slice(0, 3).map(([w]) => w)

    rounds.push({ word, icon, cat, display: blankWord(word, frac), options: shuffle([word, ...distractors]) })
  }
  return rounds
}

// ─── Path visual ────────────────────────────────────────────────────────────
function JourneyPath({ step }) {
  const charPct = step === 0 ? 2 : Math.min(96, (step / TOTAL_STEPS) * 90 + 4)
  return (
    <div className="relative w-full select-none" style={{ height: 82 }}>
      {/* Track line */}
      <div className="absolute" style={{ top: 60, left: '4%', right: '4%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,#00f5ff,#00ff88)', originX: 0 }}
          animate={{ scaleX: step / TOTAL_STEPS }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }} />
      </div>

      {/* Landmarks */}
      {LANDMARKS.map((lm, i) => {
        const pct  = ((i + 1) / TOTAL_STEPS) * 88 + 6
        const done = i < step
        const home = i === TOTAL_STEPS - 1
        return (
          <div key={i} className="absolute flex flex-col items-center"
            style={{ left: `${pct}%`, top: 0, transform: 'translateX(-50%)' }}>
            <span style={{ fontSize: home ? 22 : 13, opacity: done || home ? 1 : 0.2, filter: done ? 'none' : 'grayscale(1)', transition: 'all 0.4s' }}>
              {lm}
            </span>
            {!home && (
              <div style={{
                width: 8, height: 8, borderRadius: 4, marginTop: 4,
                background: done ? '#00f5ff' : 'rgba(255,255,255,0.12)',
                boxShadow: done ? '0 0 6px #00f5ff' : 'none',
                transition: 'all 0.35s',
              }} />
            )}
          </div>
        )
      })}

      {/* Character */}
      <motion.div className="absolute"
        style={{ top: 24, transform: 'translateX(-50%)', fontSize: step === TOTAL_STEPS ? 26 : 22, zIndex: 10, lineHeight: 1 }}
        animate={{ left: `${charPct}%` }}
        transition={{ type: 'spring', stiffness: 70, damping: 16 }}>
        {step === TOTAL_STEPS ? '🎉' : '🏃'}
      </motion.div>

      <div className="absolute" style={{ left: '2%', top: 24, transform: 'translateX(-50%)', fontSize: 13, opacity: 0.25 }}>🚩</div>
    </div>
  )
}

// ─── Main game ───────────────────────────────────────────────────────────────
export default function WordWalkGame({ onFinish, difficulty: diffProp = 'medium' }) {
  const { updateScore } = useUser()
  const navigate        = useNavigate()
  const cfg             = DIFF[diffProp] || DIFF.medium

  const [rounds]     = useState(() => buildRounds(diffProp))
  const [step,       setStep]       = useState(0)
  const [roundIdx,   setRoundIdx]   = useState(0)
  const [phase,      setPhase]      = useState('playing')
  const [timeLeft,   setTimeLeft]   = useState(cfg.duration)
  const [qTime,      setQTime]      = useState(cfg.questionSec)  // per-question timer
  const [correct,    setCorrect]    = useState(0)
  const [wrong,      setWrong]      = useState(0)
  const [flash,      setFlash]      = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [shake,      setShake]      = useState(false)
  const [showWord,   setShowWord]   = useState(null)
  const [streak,     setStreak]     = useState(0)
  const [showStreak, setShowStreak] = useState(false)
  const [revealUsed, setRevealUsed] = useState(false)
  const [revealed,   setRevealed]   = useState(null)  // the display string after reveal

  const stepRef    = useRef(0)
  const correctRef = useRef(0)
  const wrongRef   = useRef(0)
  const timeRef    = useRef(cfg.duration)
  const qTimeRef   = useRef(cfg.questionSec)
  const streakRef  = useRef(0)
  const lockedRef  = useRef(false)
  const doneRef    = useRef(false)
  const scoreRef   = useRef(0)

  // Main countdown
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) { finish(false); return }
    const t = setTimeout(() => {
      setTimeLeft(p => { const n = p - 1; timeRef.current = n; return n })
    }, 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft]) // eslint-disable-line

  // Per-question countdown
  useEffect(() => {
    if (phase !== 'playing') return
    if (qTime <= 0) {
      // Time ran out on this question — count as wrong, move on
      if (!lockedRef.current) {
        lockedRef.current = true
        wrongRef.current++
        setWrong(w => w + 1)
        setFlash('wrong')
        setShake(true)
        streakRef.current = 0
        setStreak(0)
        setTimeout(() => setShake(false), 380)
        setTimeout(() => {
          setFlash(null)
          setRevealed(null)
          setQTime(cfg.questionSec)
          qTimeRef.current = cfg.questionSec
          setRoundIdx(i => i + 1)
          lockedRef.current = false
        }, 500)
      }
      return
    }
    const t = setTimeout(() => {
      setQTime(p => { const n = p - 1; qTimeRef.current = n; return n })
    }, 1000)
    return () => clearTimeout(t)
  }, [phase, qTime, cfg.questionSec]) // eslint-disable-line

  const finish = useCallback((won) => {
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

    const round     = rounds[roundIdx]
    const isCorrect = opt === round.word
    const wasFast   = qTimeRef.current >= cfg.questionSec / 2  // answered in first half

    if (isCorrect) {
      correctRef.current++
      setCorrect(c => c + 1)
      setFlash('correct')
      setShowWord(round.word)

      // Streak
      streakRef.current++
      setStreak(streakRef.current)
      if (streakRef.current >= cfg.streakAt) {
        setShowStreak(true)
        setTimeout(() => setShowStreak(false), 1200)
      }

      // Score: base + speed bonus
      const pts = 15 + (wasFast ? cfg.bonusPts : 0) + (streakRef.current >= cfg.streakAt ? 5 : 0)
      scoreRef.current += pts

      const nextStep = stepRef.current + 1
      stepRef.current = nextStep
      setStep(nextStep)

      if (nextStep >= TOTAL_STEPS) {
        setTimeout(() => finish(true), 600)
        return
      }

      setTimeout(() => {
        setFlash(null); setSelected(null); setShowWord(null); setRevealed(null)
        setQTime(cfg.questionSec); qTimeRef.current = cfg.questionSec
        setRoundIdx(i => i + 1)
        lockedRef.current = false
      }, 480)
    } else {
      wrongRef.current++
      setWrong(w => w + 1)
      setFlash('wrong')
      setShake(true)
      streakRef.current = 0; setStreak(0)
      setTimeout(() => setShake(false), 380)
      setTimeout(() => {
        setFlash(null); setSelected(null)
        setRoundIdx(i => i + 1)  // move to next word on wrong too
        setRevealed(null)
        setQTime(cfg.questionSec); qTimeRef.current = cfg.questionSec
        lockedRef.current = false
      }, 520)
    }
  }, [phase, rounds, roundIdx, cfg, finish])

  // Reveal power-up: fill in ONE blank letter
  const handleReveal = useCallback(() => {
    if (revealUsed || lockedRef.current) return
    setRevealUsed(true)
    const round   = rounds[roundIdx]
    const display = round.display.split('')
    // Find first blank and reveal it
    const idx = display.indexOf('_')
    if (idx !== -1) {
      display[idx] = round.word[idx]
      setRevealed(display.join(''))
    }
  }, [revealUsed, rounds, roundIdx])

  const round      = rounds[Math.min(roundIdx, rounds.length - 1)]
  const timerPct   = timeLeft / cfg.duration
  const qTimePct   = qTime / cfg.questionSec
  const timerColor = timerPct > 0.45 ? '#00f5ff' : timerPct > 0.2 ? '#ffd700' : '#ff006e'
  const qColor     = qTimePct > 0.5 ? '#00ff88' : qTimePct > 0.25 ? '#ffd700' : '#ff006e'
  const displayWord = revealed || round.display

  const diffColor  = diffProp === 'easy' ? '#00ff88' : diffProp === 'hard' ? '#ff006e' : '#ffd700'
  const diffLabel  = diffProp === 'easy' ? '🌱 ROOKIE' : diffProp === 'hard' ? '💀 VETERAN' : '⚡ CHALLENGER'

  // Win screen
  if (phase === 'win') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="orb orb-cyan"  style={{ top: '-5%', left: '-10%' }} />
          <div className="orb orb-green" style={{ bottom: '5%', right: '-8%' }} />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120 }}
          className="relative z-10 text-center w-full max-w-xs">
          <motion.div animate={{ y: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 1.3 }}
            style={{ fontSize: 64, marginBottom: 12 }}>🏠</motion.div>
          <h2 className="font-orbitron text-2xl font-black neon-text-cyan mb-1">HOME!</h2>
          <p className="font-rajdhani text-sm text-gray-400 mb-5">
            Made it with <span style={{ color: '#ffd700' }}>{timeLeft}s</span> to spare
          </p>
          <div className="glass-card rounded-2xl p-5 mb-4 text-center"
            style={{ border: '1px solid rgba(0,245,255,0.35)' }}>
            <p className="font-rajdhani text-[10px] text-gray-500 tracking-widest mb-1">FINAL SCORE</p>
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
      <ResultScreen game="WORD WALK" score={scoreRef.current} color="cyan"
        stats={[
          { label: 'STEPS',    value: `${stepRef.current}/${TOTAL_STEPS}` },
          { label: 'CORRECT',  value: correctRef.current },
          { label: 'ACCURACY', value: correctRef.current + wrongRef.current > 0
              ? `${Math.round(correctRef.current / (correctRef.current + wrongRef.current) * 100)}%` : '—' },
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
      className="min-h-screen flex flex-col px-4 pt-3 pb-5 relative overflow-hidden">

      {/* Flash */}
      <AnimatePresence>
        {flash && (
          <motion.div key={flash} initial={{ opacity: 0.45 }} animate={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
            className="fixed inset-0 pointer-events-none z-20"
            style={{ background: flash === 'correct' ? 'rgba(0,255,136,0.13)' : 'rgba(255,0,110,0.13)' }} />
        )}
      </AnimatePresence>

      {/* Streak banner */}
      <AnimatePresence>
        {showStreak && (
          <motion.div
            key="streak"
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            className="fixed top-20 left-0 right-0 z-30 flex justify-center pointer-events-none">
            <div className="font-orbitron text-lg font-black px-5 py-2 rounded-full"
              style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid #ffd700', color: '#ffd700', boxShadow: '0 0 20px rgba(255,215,0,0.3)' }}>
              🔥 {streakRef.current} IN A ROW!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header row: timer · diff badge · steps */}
      <div className="relative z-10 mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-orbitron text-xs font-black" style={{ color: timerColor }}>{timeLeft}s</span>
          <span className="font-orbitron text-[9px] tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${diffColor}15`, color: diffColor, border: `1px solid ${diffColor}40` }}>
            {diffLabel}
          </span>
          <span className="font-orbitron text-xs font-black" style={{ color: '#00f5ff' }}>
            {step}/{TOTAL_STEPS} 🏠
          </span>
        </div>
        {/* Main countdown bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div className="h-full rounded-full"
            animate={{ width: `${timerPct * 100}%` }} style={{ background: timerColor }}
            transition={{ duration: 0.9 }} />
        </div>
      </div>

      {/* Journey path */}
      <div className="relative z-10 mb-1 px-1">
        <JourneyPath step={step} />
      </div>

      {/* Status row: streak fire + correct word flash */}
      <div className="h-6 flex items-center justify-center mb-2 relative z-10">
        <AnimatePresence mode="wait">
          {showWord ? (
            <motion.p key="word"
              initial={{ opacity: 0, y: 6, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="font-orbitron text-sm font-black tracking-widest"
              style={{ color: '#00ff88' }}>
              ✓ {showWord}{streak >= cfg.streakAt ? ` 🔥×${streak}` : ''}
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
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.18 }}
          className="relative z-10 flex flex-col flex-1">

          {/* Word card */}
          <div className="rounded-2xl px-5 py-4 mb-2 relative overflow-hidden"
            style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.18)' }}>

            {/* Per-question timer bar (top of card) */}
            <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-2xl"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div className="h-full"
                animate={{ width: `${qTimePct * 100}%` }}
                style={{ background: qColor, originX: 1 }}
                transition={{ duration: 0.9 }} />
            </div>

            <div className="flex items-center justify-between mb-1">
              <p className="font-rajdhani text-[10px] text-gray-600 tracking-widest">
                {round.icon}  {round.cat}
              </p>
              <span className="font-orbitron text-[10px] font-black" style={{ color: qColor }}>
                {qTime}s
              </span>
            </div>

            <p className="font-orbitron text-3xl font-black text-white tracking-[0.22em] text-center mb-1">
              {displayWord}
            </p>
            <p className="font-rajdhani text-[10px] text-gray-600 text-center">
              {round.word.length} letters
            </p>
          </div>

          {/* Power-up row */}
          <div className="flex justify-end mb-2.5">
            <motion.button
              whileTap={!revealUsed ? { scale: 0.92 } : {}}
              onClick={handleReveal}
              disabled={revealUsed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-orbitron text-[9px] tracking-widest transition-all"
              style={{
                background: revealUsed ? 'rgba(255,255,255,0.03)' : 'rgba(0,245,255,0.08)',
                border: `1px solid ${revealUsed ? 'rgba(255,255,255,0.08)' : 'rgba(0,245,255,0.35)'}`,
                color: revealUsed ? '#333' : '#00f5ff',
                minHeight: 'unset',
              }}>
              💡 {revealUsed ? 'USED' : 'REVEAL LETTER (×1)'}
            </motion.button>
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
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleAnswer(opt)}
                  disabled={!!selected}
                  className="py-4 rounded-2xl font-orbitron text-base font-black tracking-widest transition-all"
                  style={{ background: bg, border: `1px solid ${border}`, color }}>
                  {opt}
                </motion.button>
              )
            })}
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-8 mt-3">
            <div className="text-center">
              <p className="font-orbitron text-base font-black" style={{ color: '#00ff88' }}>{correct}</p>
              <p className="font-rajdhani text-[9px] text-gray-600">CORRECT</p>
            </div>
            {streak >= 2 && (
              <div className="text-center">
                <p className="font-orbitron text-base font-black" style={{ color: '#ffd700' }}>🔥 {streak}</p>
                <p className="font-rajdhani text-[9px] text-gray-600">STREAK</p>
              </div>
            )}
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
