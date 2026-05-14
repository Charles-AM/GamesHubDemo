import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'

// ── Celebrity pool ────────────────────────────────────────────────────────────
// Hints go easy → medium → obvious. Never say the name.
const CELEBS = [
  // ── SPORTS ──
  {
    name: 'Lionel Messi', cat: '⚽ SPORTS',
    hints: [
      'A Spanish club paid for this Argentine teenager\'s hormone treatment — he signed his first contract on a napkin',
      'He has won the Ballon d\'Or a record 8 times throughout his career',
      'He finally lifted the FIFA World Cup with Argentina at Qatar 2022',
    ],
  },
  {
    name: 'Cristiano Ronaldo', cat: '⚽ SPORTS',
    hints: [
      'He left a tiny Atlantic island at age 12 to chase his football dream, crying all the way',
      'He is famous for his "Siuuu!" goal celebration and obsessive fitness regime',
      'He became the first footballer to score 900 career goals, now playing in Saudi Arabia',
    ],
  },
  {
    name: 'LeBron James', cat: '🏀 SPORTS',
    hints: [
      'Sports Illustrated put this 17-year-old on their cover with the headline "The Chosen One"',
      'He won NBA championships with three different franchises across his career',
      'Known as "King James", he also co-owns a media company and an NBA franchise',
    ],
  },
  {
    name: 'Serena Williams', cat: '🎾 SPORTS',
    hints: [
      'She and her sister trained on public courts in Compton, coached by their father',
      'She won the 2017 Australian Open while eight weeks pregnant',
      'She won 23 Grand Slam singles titles — the most by any player in the Open Era',
    ],
  },
  {
    name: 'Michael Jordan', cat: '🏀 SPORTS',
    hints: [
      'He was cut from his high school varsity basketball team as a sophomore',
      'He quit the NBA at his peak to play minor league baseball for two seasons',
      'He won 6 NBA championships with the Chicago Bulls; his story is told in "The Last Dance"',
    ],
  },
  {
    name: 'Tiger Woods', cat: '⛳ SPORTS',
    hints: [
      'He appeared on TV at age 2, putting golf balls on The Mike Douglas Show',
      'He won The Masters by 12 strokes at just 21 years old',
      'After years of back surgeries and a near-fatal car crash, he won his 15th major at Augusta in 2019',
    ],
  },
  {
    name: 'Tom Brady', cat: '🏈 SPORTS',
    hints: [
      'He was the 199th pick — 6th round — in the 2000 NFL Draft, considered too slow and weak',
      'He won Super Bowls with two different NFL teams, 20 years apart',
      'He holds the record for 7 Super Bowl victories — more than any franchise in NFL history',
    ],
  },
  {
    name: 'Usain Bolt', cat: '🏃 SPORTS',
    hints: [
      'Doctors told this Jamaican his scoliosis would hold back his athletic career',
      'He set world records in the 100m AND 200m at the 2008, 2012, and 2016 Olympics',
      'His world record of 9.58 seconds in the 100m sprint has stood since 2009',
    ],
  },
  {
    name: 'Simone Biles', cat: '🤸 SPORTS',
    hints: [
      'Her private medical records were hacked and leaked during the 2016 Olympics, revealing her ADHD diagnosis',
      'She has a gymnastics skill named after her — "The Biles" — rated the hardest in the sport',
      'She withdrew from several events at Tokyo 2020 for mental health, then returned to win gold at Paris 2024',
    ],
  },
  {
    name: 'Roger Federer', cat: '🎾 SPORTS',
    hints: [
      'He was known as a total hothead in his junior years — throwing rackets and arguing with officials',
      'He won 8 Wimbledon titles and 20 Grand Slam titles across his career',
      'He retired in 2022 and played his final professional match alongside his great rival Rafael Nadal at the Laver Cup',
    ],
  },
  {
    name: 'Kobe Bryant', cat: '🏀 SPORTS',
    hints: [
      'He was selected 13th overall straight out of high school in the 1996 NBA Draft',
      'He scored 81 points in a single NBA game in 2006 — second most in history',
      'Known as "The Black Mamba", he won 5 championships with the Los Angeles Lakers',
    ],
  },
  {
    name: 'Michael Phelps', cat: '🏊 SPORTS',
    hints: [
      'He was diagnosed with ADHD at age 9 and his teacher said he\'d never be able to focus on anything',
      'He has won 23 Olympic gold medals — the most of any Olympian in history',
      'He trained under coach Bob Bowman starting at age 11 in Baltimore, Maryland',
    ],
  },
  // ── MUSIC ──
  {
    name: 'Taylor Swift', cat: '🎵 MUSIC',
    hints: [
      'She re-recorded her first six albums to reclaim ownership after a dispute with her old label',
      'Her concert tour became the highest-grossing of all time, topping $1 billion in revenue',
      'She started as a country singer from Pennsylvania and won her first Grammy at age 20',
    ],
  },
  {
    name: 'Beyoncé', cat: '🎵 MUSIC',
    hints: [
      'As a child, she beat an act three times her age in a talent show and her shocked teacher accused her of lip-syncing',
      'She was part of one of the best-selling girl groups of all time before launching her solo career',
      'Her "Lemonade" and "Renaissance" albums both broke streaming and sales records',
    ],
  },
  {
    name: 'Drake', cat: '🎵 MUSIC',
    hints: [
      'Before rap, he played a wheelchair-using student named Jimmy Brooks on a Canadian teen drama',
      'He holds the record for most songs ever charted on the Billboard Hot 100',
      'He\'s from Toronto and coined the nickname "the 6ix" for the city',
    ],
  },
  {
    name: 'Rihanna', cat: '🎵 MUSIC',
    hints: [
      'She was discovered at 15 singing in her backyard in Barbados by a music producer',
      'She launched Fenty Beauty in 2017, praised for including 40 foundation shades from the start',
      'She performed at the Super Bowl halftime show in 2023 — and revealed she was pregnant mid-performance',
    ],
  },
  {
    name: 'Ed Sheeran', cat: '🎵 MUSIC',
    hints: [
      'As a teenager he slept rough on the London Underground trying to make it as a musician',
      'He has a noticeable scar on his cheek — from a sword accidentally wielded by Princess Beatrice at a party',
      '"Shape of You" and "Perfect" are among Spotify\'s most streamed songs of all time',
    ],
  },
  {
    name: 'Adele', cat: '🎵 MUSIC',
    hints: [
      'She was signed to her first record deal after a friend secretly posted her demo on MySpace',
      'Her album "21" spent 24 weeks at #1 in the UK — the longest for a solo female artist',
      'She names every album after the age she was when she wrote it: 19, 21, 25, 30',
    ],
  },
  {
    name: 'Eminem', cat: '🎵 MUSIC',
    hints: [
      'He entered rap battles in Detroit as a teenager and was often the only white competitor on stage',
      'His alter ego "Slim Shady" debuted on his breakthrough second album in 1999',
      'His semi-autobiographical film "8 Mile" won the Oscar for Best Original Song',
    ],
  },
  {
    name: 'Lady Gaga', cat: '🎵 MUSIC',
    hints: [
      'She attended the same prestigious New York school as Paris Hilton and was accepted to NYU\'s Tisch School',
      'She wore a dress made entirely of raw meat to the 2010 MTV Video Music Awards',
      'She starred alongside Bradley Cooper in the 2018 remake of "A Star Is Born" and won an Oscar for Best Original Song',
    ],
  },
  {
    name: 'Billie Eilish', cat: '🎵 MUSIC',
    hints: [
      'She wrote her debut hit "Ocean Eyes" at just 13 years old and posted it online for free',
      'She became the youngest artist ever to win all four main Grammy categories in one night',
      'Almost all of her music is produced by her older brother in their family home studio',
    ],
  },
  {
    name: 'Justin Bieber', cat: '🎵 MUSIC',
    hints: [
      'A talent manager discovered him at age 13 after stumbling onto his YouTube covers while searching for another artist',
      'His debut single "Baby" was YouTube\'s most-disliked video for years',
      'He\'s from Stratford, Ontario, Canada and was mentored early in his career by Usher',
    ],
  },
  {
    name: 'Bruno Mars', cat: '🎵 MUSIC',
    hints: [
      'He performed as a child Elvis impersonator in Hawaii and was featured in a local newspaper',
      'He wrote mega-hits for other artists — including "Nothin\' on You" and "Billionaire" — before his own debut',
      'He performed at the Super Bowl 50 halftime show and later headlined Las Vegas residencies at the Park MGM',
    ],
  },
  // ── FILM & TV ──
  {
    name: 'Tom Hanks', cat: '🎬 FILM & TV',
    hints: [
      'He is the only actor to win back-to-back Academy Awards for Best Actor',
      'He played a man stranded on an island for years with only a volleyball named Wilson for company',
      'He voiced the cowboy hero of a beloved Pixar animated franchise across four films',
    ],
  },
  {
    name: 'Dwayne Johnson', cat: '🎬 FILM & TV',
    hints: [
      'At 23 he had just $7 in his pocket after being cut from the Canadian Football League',
      'He played college football at the University of Miami before becoming a professional wrestler',
      'Known as "The Rock", he became one of Hollywood\'s highest-paid actors of the 2010s and 2020s',
    ],
  },
  {
    name: 'Leonardo DiCaprio', cat: '🎬 FILM & TV',
    hints: [
      'His mother named him after the Renaissance artist when she felt him kick while looking at a Da Vinci painting',
      'He received four Oscar nominations before finally winning Best Actor for "The Revenant" in 2016',
      'He starred opposite Kate Winslet in James Cameron\'s 1997 epic blockbuster set on a doomed ocean liner',
    ],
  },
  {
    name: 'Oprah Winfrey', cat: '🎬 FILM & TV',
    hints: [
      'She was fired from her first TV job as a reporter and told she was "unfit for television"',
      'She became the first Black female billionaire in North America',
      'Her book club recommendations could launch unknown authors to instant bestseller status overnight',
    ],
  },
  {
    name: 'Will Smith', cat: '🎬 FILM & TV',
    hints: [
      'He began his career as a rapper called "The Fresh Prince" before starring in a sitcom of the same name',
      'He slapped a presenter live on stage at the 2022 Academy Awards',
      'He received Oscar nominations for portraying Muhammad Ali and Venus & Serena Williams\' father',
    ],
  },
  {
    name: 'Jennifer Aniston', cat: '🎬 FILM & TV',
    hints: [
      'Her father is soap opera actor John Aniston, famous for Days of Our Lives',
      'She played Rachel Green in one of the most-watched sitcoms of the 1990s',
      'Her character\'s layered haircut became a global phenomenon — salons worldwide were flooded with requests for "The Rachel"',
    ],
  },
  {
    name: 'Ryan Reynolds', cat: '🎬 FILM & TV',
    hints: [
      'He was born and raised in Vancouver, Canada, one of four brothers',
      'He co-owns Aviation American Gin and bought Welsh football club Wrexham AFC with a friend',
      'He plays the wisecracking, fourth-wall-breaking Marvel antihero Deadpool',
    ],
  },
  {
    name: 'Meryl Streep', cat: '🎬 FILM & TV',
    hints: [
      'She has received more Oscar nominations than any other actor in history — 21 total',
      'She learned Polish for "Sophie\'s Choice" and a New Zealand accent for "A Cry in the Dark"',
      'She played the terrifying fashion magazine editor Miranda Priestly in "The Devil Wears Prada"',
    ],
  },
  {
    name: 'Brad Pitt', cat: '🎬 FILM & TV',
    hints: [
      'Before his big break he drove a limo and wore a chicken costume outside a fast-food restaurant',
      'He starred in "Fight Club", the "Ocean\'s Eleven" trilogy, and "Inglourious Basterds"',
      'He and Angelina Jolie were one of the most famous celebrity couples in the world, known as "Brangelina"',
    ],
  },
  {
    name: 'Scarlett Johansson', cat: '🎬 FILM & TV',
    hints: [
      'She made her film debut aged 9 in the Rob Reiner comedy "North"',
      'She played a super-spy from Budapest in the Marvel Cinematic Universe for over a decade',
      'She sued Disney in 2021 over releasing her solo film simultaneously on streaming and in cinemas',
    ],
  },
  {
    name: 'Kevin Hart', cat: '🎬 FILM & TV',
    hints: [
      'He started doing stand-up in Philadelphia, where clubs would sometimes pay him not to perform',
      'He is notably short for a leading man — a recurring subject in his own comedy',
      'He starred in "Ride Along", "Jumanji: Welcome to the Jungle", and "Central Intelligence"',
    ],
  },
  {
    name: 'Zendaya', cat: '🎬 FILM & TV',
    hints: [
      'She started as a backup dancer and model before landing a role on a Disney Channel show',
      'She became the youngest actress to win the Emmy for Outstanding Lead Actress in a Drama Series',
      'She plays Rue in "Euphoria" and starred in "Dune" and "Challengers"',
    ],
  },
  {
    name: 'Shaquille O\'Neal', cat: '🏀 SPORTS',
    hints: [
      'He completed a doctorate in education from Barry University in 2012',
      'He released four rap albums and starred in movies including "Kazaam" and "Blue Chips"',
      'Known as "Shaq", he won four NBA championships and played for six different teams in his career',
    ],
  },
  {
    name: 'Cardi B', cat: '🎵 MUSIC',
    hints: [
      'She went viral on Instagram and was cast in a reality TV show before ever releasing music',
      'She became the first solo female rapper to score multiple #1 hits on the Billboard Hot 100',
      '"Bodak Yellow" made her the first female rapper to top the Billboard Hot 100 solo in 19 years',
    ],
  },
  {
    name: 'Post Malone', cat: '🎵 MUSIC',
    hints: [
      'He moved from Syracuse to Dallas to Los Angeles and recorded his debut track in 30 minutes on GarageBand',
      'He is heavily tattooed including on his face, and has a prominent "Always Tired" tattoo under his eyes',
      '"Rockstar", "Sunflower", and "Circles" are among his biggest global hits',
    ],
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
const POINTS_BY_HINT = [10, 6, 3]   // pts for correct on hint 1, 2, 3
const ROUNDS         = 10

const GRADES = [
  { min: 90, label: 'CELEBRITY GURU',    color: '#ffd700' },
  { min: 70, label: 'SHOWBIZ SAVVY',     color: '#bf00ff' },
  { min: 50, label: 'CASUAL FAN',        color: '#00f5ff' },
  { min:  0, label: 'WHO ARE THESE PEOPLE?', color: '#888' },
]
const getGrade = (s) => GRADES.find(g => s >= g.min) || GRADES[GRADES.length - 1]

function buildRounds() {
  const shuffled = [...CELEBS].sort(() => Math.random() - 0.5).slice(0, ROUNDS)
  return shuffled.map(celeb => {
    const others = CELEBS
      .filter(c => c.name !== celeb.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    const options = [celeb.name, ...others.map(o => o.name)].sort(() => Math.random() - 0.5)
    return { celeb, options }
  })
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function CelebGame({ onFinish }) {
  const { updateScore } = useUser()

  const [rounds,    setRounds]    = useState([])
  const [qIdx,      setQIdx]      = useState(0)
  const [hintIdx,   setHintIdx]   = useState(0)   // 0-2 (which hint is latest)
  const [selected,  setSelected]  = useState(null)
  const [result,    setResult]    = useState(null) // 'correct' | 'wrong'
  const [total,     setTotal]     = useState(0)
  const [screen,    setScreen]    = useState('game')

  const totalRef = useRef(0)
  const busy     = useRef(false)

  useEffect(() => { setRounds(buildRounds()) }, [])

  const advance = useCallback((newTotal, nextIdx) => {
    if (nextIdx >= ROUNDS) {
      updateScore?.('celeb', newTotal)
      onFinish?.(newTotal)
      setScreen('results')
    } else {
      setQIdx(nextIdx)
      setHintIdx(0)
      setSelected(null)
      setResult(null)
      busy.current = false
    }
  }, [updateScore, onFinish])

  const handleAnswer = useCallback((name) => {
    if (busy.current || result) return
    busy.current = true

    const q    = rounds[qIdx]
    const correct = name === q.celeb.name
    const pts  = correct ? POINTS_BY_HINT[hintIdx] : 0

    setSelected(name)
    setResult(correct ? 'correct' : 'wrong')
    if (correct) {
      totalRef.current += pts
      setTotal(totalRef.current)
    }

    setTimeout(() => advance(totalRef.current, qIdx + 1), 1400)
  }, [rounds, qIdx, hintIdx, result, advance])

  const revealHint = () => {
    if (hintIdx < 2 && !result) setHintIdx(h => h + 1)
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (screen === 'results') {
    const grade = getGrade(total)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-24">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-3xl p-6 text-center"
          style={{ background: 'rgba(10,10,28,0.97)', border: '1px solid rgba(191,0,255,0.35)' }}>

          <div className="text-5xl mb-3">🌟</div>
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-1">FINAL SCORE</p>
          <p className="font-orbitron text-5xl font-black mb-1" style={{ color: '#bf00ff' }}>{total}</p>
          <p className="font-orbitron text-xs font-bold mb-1" style={{ color: '#888' }}>OUT OF {ROUNDS * 10}</p>
          <p className="font-orbitron text-sm font-bold mb-6" style={{ color: grade.color }}>{grade.label}</p>

          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            {[
              { label: 'CORRECT',  value: rounds.filter((_, i) => i < ROUNDS).length, color: '#00ff88' },
              { label: 'MAX PTS',  value: `${ROUNDS * 10}`, color: '#ffd700' },
              { label: 'ACCURACY', value: `${Math.round((total / (ROUNDS * 10)) * 100)}%`, color: '#00f5ff' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl py-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="font-orbitron text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="font-rajdhani text-[9px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="text-left mb-5 rounded-2xl p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-orbitron text-[9px] text-gray-500 tracking-widest mb-2">SCORING</p>
            {[
              ['Correct on hint 1', '10 pts'],
              ['Correct on hint 2', '6 pts'],
              ['Correct on hint 3', '3 pts'],
              ['Wrong answer', '0 pts'],
            ].map(([label, pts]) => (
              <div key={label} className="flex justify-between mb-1">
                <p className="font-rajdhani text-xs text-gray-400">{label}</p>
                <p className="font-orbitron text-[10px]" style={{ color: '#bf00ff' }}>{pts}</p>
              </div>
            ))}
          </div>

          <button onClick={() => {
            totalRef.current = 0
            setTotal(0); setQIdx(0); setHintIdx(0)
            setSelected(null); setResult(null)
            setRounds(buildRounds()); setScreen('game')
            busy.current = false
          }}
            className="w-full py-3 rounded-2xl font-orbitron text-xs tracking-widest"
            style={{ background: 'rgba(191,0,255,0.1)', border: '1px solid rgba(191,0,255,0.4)', color: '#bf00ff' }}>
            🔄 PLAY AGAIN
          </button>
        </motion.div>
      </div>
    )
  }

  if (!rounds.length) return null
  const q   = rounds[qIdx]
  const pct = POINTS_BY_HINT[hintIdx]

  // ── Game screen ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen px-4 pb-24 pt-5 select-none">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">QUESTION</p>
          <p className="font-orbitron text-2xl font-black text-white">
            {qIdx + 1}<span className="text-base text-gray-600">/{ROUNDS}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">SCORE</p>
          <p className="font-orbitron text-2xl font-black" style={{ color: '#bf00ff' }}>{total}</p>
        </div>
        <div className="text-right">
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">WORTH</p>
          <p className="font-orbitron text-2xl font-black" style={{ color: pct === 10 ? '#ffd700' : pct === 6 ? '#00f5ff' : '#888' }}>
            {pct}
          </p>
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}
          className="rounded-3xl p-5 mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(191,0,255,0.1), rgba(0,0,0,0))',
            border: '1px solid rgba(191,0,255,0.3)',
          }}>

          {/* Category */}
          <span className="font-orbitron text-[9px] tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(191,0,255,0.15)', color: '#bf00ff', border: '1px solid rgba(191,0,255,0.35)' }}>
            {q.celeb.cat}
          </span>

          {/* Hints */}
          <div className="mt-4 flex flex-col gap-3">
            {q.celeb.hints.slice(0, hintIdx + 1).map((hint, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center font-orbitron text-[9px] mt-0.5"
                  style={{
                    background: i === 0 ? 'rgba(255,215,0,0.2)' : i === 1 ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.08)',
                    color: i === 0 ? '#ffd700' : i === 1 ? '#00f5ff' : '#888',
                    border: `1px solid ${i === 0 ? 'rgba(255,215,0,0.4)' : i === 1 ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {i + 1}
                </div>
                <p className="font-rajdhani text-sm text-gray-200 leading-relaxed flex-1">{hint}</p>
              </motion.div>
            ))}
          </div>

          {/* Reveal hint button */}
          {!result && hintIdx < 2 && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={revealHint}
              className="mt-4 w-full py-2 rounded-xl font-orbitron text-[10px] tracking-widest transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#666' }}>
              REVEAL HINT {hintIdx + 2} &nbsp;
              <span style={{ color: '#444' }}>(-{POINTS_BY_HINT[hintIdx] - POINTS_BY_HINT[hintIdx + 1]} pts)</span>
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* WHO IS IT? label */}
      <p className="font-orbitron text-[10px] text-gray-500 tracking-widest text-center mb-3">WHO IS IT?</p>

      {/* Answer options */}
      <div className="grid grid-cols-1 gap-2.5">
        {q.options.map((name) => {
          const isSelected = selected === name
          const isCorrect  = name === q.celeb.name
          let borderColor  = 'rgba(255,255,255,0.1)'
          let bgColor      = 'rgba(255,255,255,0.04)'
          let textColor    = '#ccc'

          if (result) {
            if (isCorrect) { borderColor = '#00ff88'; bgColor = 'rgba(0,255,136,0.12)'; textColor = '#00ff88' }
            else if (isSelected) { borderColor = '#ff006e'; bgColor = 'rgba(255,0,110,0.1)'; textColor = '#ff006e' }
            else { textColor = '#333' }
          }

          return (
            <motion.button key={name}
              whileTap={!result ? { scale: 0.98 } : {}}
              onClick={() => handleAnswer(name)}
              className="w-full px-4 py-3.5 rounded-2xl text-left font-rajdhani text-sm font-bold transition-all"
              style={{ background: bgColor, border: `1px solid ${borderColor}`, color: textColor }}>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs"
                  style={{
                    background: result && isCorrect ? 'rgba(0,255,136,0.2)' : result && isSelected ? 'rgba(255,0,110,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${result && isCorrect ? '#00ff88' : result && isSelected ? '#ff006e' : 'rgba(255,255,255,0.12)'}`,
                  }}>
                  {result && isCorrect ? '✓' : result && isSelected ? '✗' : ''}
                </div>
                <span>{name}</span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
