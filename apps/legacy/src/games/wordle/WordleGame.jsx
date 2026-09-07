import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import ResultScreen from '../../components/ResultScreen'

const WORDS = [
  'ABOUT','ABOVE','ABUSE','ACTOR','ACUTE','ADMIT','ADULT','AFTER','AGAIN','AGENT',
  'AGREE','AHEAD','ALARM','ALBUM','ALERT','ALIKE','ALIVE','ALLEY','ALLOW','ALONE',
  'ALONG','ALTER','ANGEL','ANGER','ANGLE','ANIME','ANKLE','APART','APPLE','APPLY',
  'ARENA','ARGUE','ARISE','ARMOR','ARRAY','ARROW','ASIDE','ASSET','AVOID','AWAKE',
  'AWARD','AWARE','AWFUL','BAKER','BASIC','BASIS','BATCH','BEACH','BEAST','BEGIN',
  'BELOW','BENCH','BERRY','BLAZE','BLEND','BLIND','BLOCK','BLOOD','BLOOM','BLOWN',
  'BOARD','BONUS','BOOST','BOUND','BOXER','BRAIN','BRAVE','BREAD','BREAK','BREED',
  'BRIEF','BRING','BROAD','BRUSH','BUILD','BUILT','BUYER','CABIN','CABLE','CANDY',
  'CARRY','CATCH','CAUSE','CHAIN','CHAIR','CHAOS','CHARM','CHASE','CHECK','CHESS',
  'CHEST','CHIEF','CHILD','CIVIL','CLAIM','CLASH','CLASS','CLEAN','CLEAR','CLICK',
  'CLOCK','CLOSE','CLOUD','COACH','COAST','COLOR','CORAL','COUNT','COURT','COVER',
  'CRACK','CRAFT','CRANE','CRASH','CRAZY','CROSS','CROWD','CROWN','CRUSH','CURVE',
  'CYCLE','DAILY','DANCE','DECAY','DELAY','DELTA','DEMON','DENSE','DEPTH','DIRTY',
  'DODGE','DOUBT','DOUGH','DRAFT','DRAMA','DREAM','DRINK','DRIVE','DRUMS','EAGER',
  'EAGLE','EARLY','EARTH','EIGHT','ELITE','EMPTY','ENEMY','ENJOY','ENTER','EQUAL',
  'ESSAY','EXACT','EXIST','EXTRA','FABLE','FAIRY','FALSE','FANCY','FAULT','FEAST',
  'FENCE','FEVER','FIBER','FIELD','FIFTH','FIGHT','FINAL','FLAME','FLASH','FLESH',
  'FLOAT','FLOOD','FLOOR','FOCUS','FORCE','FORGE','FORUM','FOUND','FRAME','FRESH',
  'FRONT','FROST','FRUIT','FULLY','FUNNY','GIANT','GIVEN','GLOBE','GLORY','GLOVE',
  'GRACE','GRADE','GRAIN','GRANT','GRAPH','GRASP','GRASS','GREAT','GRIEF','GRIND',
  'GROSS','GROVE','GROWN','GUARD','GUESS','GUEST','GUIDE','GUILT','HABIT','HAPPY',
  'HARSH','HEART','HEAVY','HERBS','HONOR','HORSE','HOTEL','HOUSE','HUMAN','HUMOR',
  'IDEAL','INPUT','ISSUE','JOINT','JUDGE','JUICE','KNIFE','KNOCK','KNOWN','LARGE',
  'LASER','LATER','LAYER','LEARN','LEGAL','LEMON','LEVEL','LIGHT','LIMIT','LOCAL',
  'LOGIC','LOOSE','LOVER','LOWER','LUCKY','LUNCH','MAGIC','MAJOR','MAKER','MAPLE',
  'MATCH','MAYBE','MAYOR','MEDIA','MERCY','METAL','MINOR','MODEL','MONEY','MONTH',
  'MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MOVIE','MUSIC','NAVAL','NERVE','NEVER',
  'NIGHT','NOBLE','NOISE','NORTH','NOVEL','NURSE','OCCUR','OCEAN','OFFER','ORDER',
  'ORGAN','OUTER','PAINT','PANEL','PAPER','PARTY','PATCH','PAUSE','PEACE','PENNY',
  'PHONE','PHOTO','PIANO','PIECE','PILOT','PINCH','PITCH','PIXEL','PIZZA','PLACE',
  'PLAIN','PLANT','PLAZA','PLUME','POINT','POLAR','POWER','PRESS','PRICE','PRIDE',
  'PRIME','PRINT','PRIZE','PROBE','PROOF','PROUD','PULSE','PUNCH','QUEEN','QUEST',
  'QUICK','QUIET','RADAR','RADIO','RAISE','RALLY','RANCH','RANGE','RAPID','REACH',
  'READY','REALM','REBEL','REFER','REIGN','RELAY','REPLY','RIDER','RIGHT','RISKY',
  'RIVAL','RIVER','ROBOT','ROCKY','ROUND','ROYAL','RULER','RUSTY','SAINT','SAUCE',
  'SCALE','SCENE','SCOPE','SCORE','SCOUT','SENSE','SERVE','SETUP','SEVEN','SHADE',
  'SHAKE','SHALL','SHAPE','SHARE','SHARK','SHARP','SHEEP','SHEET','SHELF','SHELL',
  'SHIFT','SHINE','SHOCK','SHOOT','SHORT','SHOUT','SIGHT','SINCE','SIXTH','SKILL',
  'SKULL','SLASH','SLEEP','SLICE','SLIDE','SLOPE','SMART','SMILE','SMOKE','SNAKE',
  'SOLAR','SOLID','SONIC','SOLVE','SOUTH','SPACE','SPARE','SPARK','SPEAK','SPEED',
  'SPEND','SPICE','SPINE','SPORT','STAFF','STAGE','STAKE','STAND','START','STATE',
  'STEAM','STEEL','STOCK','STORM','STORY','STYLE','SUGAR','SUPER','SURGE','SWEET',
  'SWIFT','SWORD','TABLE','TASTE','THEME','THICK','THING','THINK','THIRD','THREE',
  'THROW','TIGER','TIGHT','TITLE','TODAY','TOKEN','TOTAL','TOUCH','TOUGH','TOWER',
  'TRACK','TRADE','TRAIL','TRAIN','TRAIT','TREAT','TREND','TRIAL','TRIBE','TRICK',
  'TRUCK','TRULY','TRUNK','TRUST','TRUTH','TWIST','ULTRA','UNCLE','UNDER','UNION',
  'UNITY','UNTIL','UPPER','UPSET','URBAN','VALID','VALUE','VERSE','VIDEO','VIRAL',
  'VISIT','VITAL','VIVID','VOCAL','VOICE','VOTER','WATCH','WATER','WHALE','WHERE',
  'WHICH','WHILE','WHITE','WHOLE','WITCH','WORLD','WORRY','WOULD','WOUND','WRITE',
  'WRONG','YACHT','YOUNG','YOUTH','ZEBRA','ZOOMS',
]

const HISTORY_KEY = 'arcadia_wordle_history'
const MAX_GUESSES = 6

function getRandomWord() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  const available = WORDS.filter(w => !history.includes(w))
  const pool = available.length > 0 ? available : WORDS
  const word = pool[Math.floor(Math.random() * pool.length)]
  const newHistory = [...history, word].slice(-5)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
  return word
}

function checkGuess(guess, target) {
  const result = Array(5).fill('absent')
  const targetArr = target.split('')
  const guessArr = guess.split('')
  const used = Array(5).fill(false)

  // First pass: correct
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct'
      used[i] = true
    }
  }
  // Second pass: present
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === targetArr[j]) {
        result[i] = 'present'
        used[j] = true
        break
      }
    }
  }
  return result
}

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
]

const TILE_COLORS = {
  correct: { bg: '#00ff88', border: '#00ff88', text: '#000' },
  present: { bg: '#ffd700', border: '#ffd700', text: '#000' },
  absent:  { bg: '#1a1a3e', border: '#444',    text: '#888' },
  empty:   { bg: 'transparent', border: '#333', text: '#fff' },
  active:  { bg: 'transparent', border: '#00f5ff', text: '#fff' },
}

export default function WordleGame({ onFinish }) {
  const [target, setTarget] = useState('')
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [phase, setPhase] = useState('playing')
  const [shake, setShake] = useState(false)
  const [letterMap, setLetterMap] = useState({})
  const [revealRow, setRevealRow] = useState(-1)
  const { updateScore } = useUser()
  const navigate = useNavigate()

  const startGame = useCallback(() => {
    const word = getRandomWord()
    setTarget(word)
    setGuesses([])
    setCurrent('')
    setPhase('playing')
    setLetterMap({})
    setRevealRow(-1)
  }, [])

  useEffect(() => { startGame() }, [startGame])

  const submitGuess = useCallback(() => {
    if (current.length !== 5) { setShake(true); setTimeout(() => setShake(false), 500); return }
    if (!WORDS.includes(current)) { setShake(true); setTimeout(() => setShake(false), 500); return }

    const result = checkGuess(current, target)
    const newGuess = { word: current, result }
    const newGuesses = [...guesses, newGuess]
    setGuesses(newGuesses)
    setCurrent('')
    setRevealRow(newGuesses.length - 1)

    // Update letter map
    const newMap = { ...letterMap }
    for (let i = 0; i < 5; i++) {
      const letter = current[i]
      const priority = { correct: 3, present: 2, absent: 1 }
      if (!newMap[letter] || priority[result[i]] > priority[newMap[letter]]) {
        newMap[letter] = result[i]
      }
    }
    setLetterMap(newMap)

    const won = result.every(r => r === 'correct')
    setTimeout(() => {
      if (won) {
        const score = (MAX_GUESSES - newGuesses.length + 1) * 100
        updateScore('wordle', score)
        setPhase('won')
        if (onFinish) onFinish(score)
      } else if (newGuesses.length >= MAX_GUESSES) {
        setPhase('lost')
        if (onFinish) onFinish(0)
      }
    }, 5 * 300 + 200)
  }, [current, guesses, target, letterMap, updateScore])

  const handleKey = useCallback((key) => {
    if (phase !== 'playing') return
    if (key === 'ENTER') { submitGuess(); return }
    if (key === '⌫' || key === 'BACKSPACE') { setCurrent(c => c.slice(0, -1)); return }
    if (/^[A-Z]$/.test(key) && current.length < 5) { setCurrent(c => c + key); return }
  }, [phase, current, submitGuess])

  useEffect(() => {
    const handler = (e) => handleKey(e.key.toUpperCase())
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleKey])

  const score = phase === 'won'
    ? (MAX_GUESSES - guesses.length + 1) * 100
    : 0

  if (phase === 'won' || phase === 'lost') {
    return (
      <ResultScreen
        game="WORDLE DUEL"
        score={score}
        stats={[
          { label: 'TRIES', value: `${guesses.length}/${MAX_GUESSES}` },
          { label: 'WORD', value: target },
        ]}
        outcome={phase === 'won' ? 'win' : 'lose'}
        onPlayAgain={startGame}
        onHub={() => navigate('/hub')}
        color="green"
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate('/hub')} className="font-orbitron text-xs tracking-widest px-3 py-1 rounded-lg transition-all" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#555' }}>← QUIT</button>
        <span className="font-orbitron text-xs neon-text-green tracking-widest">WORDLE DUEL</span>
        <span className="font-orbitron text-xs text-gray-500">{guesses.length}/{MAX_GUESSES}</span>
      </div>

      {/* Grid */}
      <div className="flex flex-col items-center gap-1.5 mb-6 flex-1 justify-center">
        {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
          const guess = guesses[rowIdx]
          const isCurrent = rowIdx === guesses.length
          const word = guess ? guess.word : isCurrent ? current : ''
          const isRevealing = rowIdx === revealRow

          return (
            <motion.div
              key={rowIdx}
              className="flex gap-1.5"
              animate={isCurrent && shake ? { x: [-6,6,-6,6,-4,4,0] } : {}}
              transition={{ duration: 0.4 }}
            >
              {Array.from({ length: 5 }).map((_, colIdx) => {
                const letter = word[colIdx] || ''
                let status = 'empty'
                if (guess) status = guess.result[colIdx]
                else if (isCurrent && letter) status = 'active'

                const colors = TILE_COLORS[status]

                return (
                  <motion.div
                    key={colIdx}
                    className="w-13 h-13 flex items-center justify-center rounded-lg font-orbitron font-black text-lg"
                    style={{
                      width: 52, height: 52,
                      backgroundColor: colors.bg,
                      border: `2px solid ${colors.border}`,
                      color: colors.text,
                    }}
                    animate={isRevealing ? {
                      rotateX: [0, -90, 0],
                      transition: { delay: colIdx * 0.3, duration: 0.5 }
                    } : {}}
                    initial={isCurrent && letter && !guess ? { scale: [1, 1.12, 1] } : {}}
                  >
                    {letter}
                  </motion.div>
                )
              })}
            </motion.div>
          )
        })}
      </div>

      {/* Keyboard */}
      <div className="flex flex-col items-center gap-1.5">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map(key => {
              const status = letterMap[key]
              let bg = 'rgba(255,255,255,0.08)'
              let color = '#ccc'
              let border = 'rgba(255,255,255,0.1)'
              if (status === 'correct') { bg = '#00ff88'; color = '#000'; border = '#00ff88' }
              else if (status === 'present') { bg = '#ffd700'; color = '#000'; border = '#ffd700' }
              else if (status === 'absent') { bg = 'rgba(255,255,255,0.03)'; color = '#444'; border = 'rgba(255,255,255,0.05)' }

              return (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleKey(key)}
                  className="rounded-lg font-orbitron font-bold transition-all duration-200"
                  style={{
                    background: bg,
                    color,
                    border: `1px solid ${border}`,
                    minWidth: key.length > 1 ? 48 : 32,
                    height: 42,
                    fontSize: key.length > 1 ? 9 : 13,
                    padding: '0 4px',
                  }}
                >
                  {key}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
