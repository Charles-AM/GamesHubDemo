import { createContext, useContext, useState, useCallback } from 'react'

const Ctx = createContext()

// ── XP & Levels ────────────────────────────────────────────
export const XP_PER_LEVEL = 300
export const getLevel       = (xp = 0) => Math.floor(xp / XP_PER_LEVEL) + 1
export const getLevelPct    = (xp = 0) => (xp % XP_PER_LEVEL) / XP_PER_LEVEL
export const getXpToNext    = (xp = 0) => XP_PER_LEVEL - (xp % XP_PER_LEVEL)

// ── Avatars ────────────────────────────────────────────────
export const AVATARS = [
  '🦊','🐺','🦁','🐯','🐻','🦝','🐸','🦄',
  '🤖','👾','🧙','🥷','🦸','🧛','👻','🎭',
  '🦅','🐉','🌙','⚡','🎯','💀','🌺','🔮',
]

// ── Achievements ───────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first_game',  icon: '🎮', name: 'ROOKIE',        desc: 'Play your first game',         xp: 50  },
  { id: 'vs_first',    icon: '⚔️', name: 'CHALLENGER',    desc: 'Play your first VS match',     xp: 50  },
  { id: 'vs_win',      icon: '🏆', name: 'VICTOR',        desc: 'Win your first VS match',      xp: 100 },
  { id: 'vs_5wins',    icon: '⚡', name: 'STREAK KING',   desc: 'Win 5 VS matches',             xp: 200 },
  { id: 'vs_10wins',   icon: '👑', name: 'DOMINATOR',     desc: 'Win 10 VS matches',            xp: 300 },
  { id: 'plays_10',    icon: '🔥', name: 'REGULAR',       desc: 'Play 10 games',                xp: 100 },
  { id: 'plays_25',    icon: '💫', name: 'DEDICATED',     desc: 'Play 25 games',                xp: 150 },
  { id: 'plays_50',    icon: '🌟', name: 'VETERAN',       desc: 'Play 50 games',                xp: 300 },
  { id: 'all_games',   icon: '🗺️', name: 'EXPLORER',     desc: 'Play all 5 games',             xp: 100 },
  { id: 'trivia_700',  icon: '🧠', name: 'GENIUS',        desc: 'Score 700+ in Trivia',         xp: 150 },
  { id: 'flags_500',   icon: '🌍', name: 'GLOBE TROTTER', desc: 'Score 500+ in Flag Frenzy',    xp: 150 },
  { id: 'wordle_2',    icon: '🔤', name: 'WORDSMITH',     desc: 'Solve Wordle in ≤2 tries',     xp: 200 },
  { id: 'streak_3',    icon: '📅', name: 'ON FIRE',       desc: '3-day play streak',            xp: 150 },
  { id: 'streak_7',    icon: '💎', name: 'UNSTOPPABLE',   desc: '7-day play streak',            xp: 500 },
  { id: 'daily_done',  icon: '🌅', name: 'DAILY GRINDER', desc: 'Complete a daily challenge',   xp: 75  },
]

// ── Daily challenge ────────────────────────────────────────
const DAILY_ROTATION = ['trivia', 'wordle', 'wordsearch', 'crossword', 'flags', 'trivia', 'flags']
export const getDailyGame = () => DAILY_ROTATION[new Date().getDay()]
export const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// ── Storage ────────────────────────────────────────────────
const K = {
  users:   'arcadia_users',
  scores:  'arcadia_scores',
  history: 'arcadia_history',
  achiev:  'arcadia_achiev',
  current: 'arcadia_current',
}
const ls  = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb } }
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v))

// ── Provider ───────────────────────────────────────────────
export function UserProvider({ children }) {
  // { [userId]: { id, username, avatar, xp, streak, joinedAt } }
  const [allUsers,    setAllUsers]    = useState(() => ls(K.users,   {}))
  const [currentId,   setCurrentId]   = useState(() => ls(K.current, null))
  // { [userId]: { [game]: { best, last, plays, wins, losses } } }
  const [allScores,   setAllScores]   = useState(() => ls(K.scores,  {}))
  // { [userId]: [...records] }
  const [allHistory,  setAllHistory]  = useState(() => ls(K.history, {}))
  // { [userId]: [...achievementIds] }
  const [allAchiev,   setAllAchiev]   = useState(() => ls(K.achiev,  {}))

  const user         = currentId ? (allUsers[currentId]   || null) : null
  const scores       = currentId ? (allScores[currentId]  || {})   : {}
  const matchHistory = currentId ? (allHistory[currentId] || [])   : []
  const achievements = currentId ? (allAchiev[currentId]  || [])   : []

  // ── Account management ──────────────────────────────────
  const createUser = useCallback((username, avatar = '🎮') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const newUser = { id, username, avatar, xp: 0, streak: { count: 0, lastDate: null }, joinedAt: Date.now() }
    const updated = { ...allUsers, [id]: newUser }
    setAllUsers(updated); lsSet(K.users, updated)
    setCurrentId(id);     lsSet(K.current, id)
    return newUser
  }, [allUsers])

  const loginAs = useCallback((userId) => {
    setCurrentId(userId); lsSet(K.current, userId)
  }, [])

  const logout = useCallback(() => {
    setCurrentId(null); localStorage.removeItem(K.current)
  }, [])

  // ── Record a game ───────────────────────────────────────
  const recordGame = useCallback(({
    game, score,
    mode = 'solo',
    won = null,
    p2Name = null, p2Score = null,
    isDaily = false,
    wordle_tries = null,
  }) => {
    if (!currentId) return {}

    // XP earned
    let xpEarned = 10 + Math.floor(score / 20)
    if (mode === 'versus') xpEarned += won ? 60 : 20
    if (isDaily) xpEarned = Math.floor(xpEarned * 2)

    // ── Scores ──
    const prevUserScores = allScores[currentId] || {}
    const prev = prevUserScores[game] || { best: 0, last: 0, plays: 0, wins: 0, losses: 0 }
    const newGame = {
      best:   Math.max(score, prev.best),
      last:   score,
      plays:  prev.plays + 1,
      wins:   prev.wins   + (mode === 'versus' && won        ? 1 : 0),
      losses: prev.losses + (mode === 'versus' && won === false ? 1 : 0),
    }
    const newAllScores = { ...allScores, [currentId]: { ...prevUserScores, [game]: newGame } }
    setAllScores(newAllScores); lsSet(K.scores, newAllScores)

    // ── Streak ──
    const today = todayKey()
    const prevUser = allUsers[currentId]
    const streak = prevUser.streak || { count: 0, lastDate: null }
    let newStreak = streak
    let newStreakCount = streak.count
    if (streak.lastDate !== today) {
      const d = new Date(); d.setDate(d.getDate() - 1)
      const yesterday = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      newStreakCount = streak.lastDate === yesterday ? streak.count + 1 : 1
      newStreak = { count: newStreakCount, lastDate: today }
    }

    // ── Achievements ──
    const prevAchiev = new Set(allAchiev[currentId] || [])
    const newAchiev  = new Set(prevAchiev)
    const unlocked   = []
    const newUs      = newAllScores[currentId]
    const totalPlays = Object.values(newUs).reduce((a, s) => a + s.plays, 0)
    const totalWins  = Object.values(newUs).reduce((a, s) => a + (s.wins || 0), 0)
    const gamesSet   = new Set(Object.keys(newUs))

    const chk = (id, cond) => {
      if (cond && !newAchiev.has(id)) { newAchiev.add(id); unlocked.push(id) }
    }
    chk('first_game',  true)
    chk('vs_first',    mode === 'versus')
    chk('vs_win',      mode === 'versus' && won)
    chk('vs_5wins',    totalWins >= 5)
    chk('vs_10wins',   totalWins >= 10)
    chk('plays_10',    totalPlays >= 10)
    chk('plays_25',    totalPlays >= 25)
    chk('plays_50',    totalPlays >= 50)
    chk('all_games',   gamesSet.size >= 5)
    chk('trivia_700',  game === 'trivia' && score >= 700)
    chk('flags_500',   game === 'flags'  && score >= 500)
    chk('wordle_2',    game === 'wordle' && wordle_tries !== null && wordle_tries <= 2)
    chk('streak_3',    newStreakCount >= 3)
    chk('streak_7',    newStreakCount >= 7)
    chk('daily_done',  isDaily)

    const achievXp = unlocked.reduce((a, id) => a + (ACHIEVEMENTS.find(x => x.id === id)?.xp || 0), 0)
    const totalXp  = xpEarned + achievXp

    if (unlocked.length > 0) {
      const updated = { ...allAchiev, [currentId]: [...newAchiev] }
      setAllAchiev(updated); lsSet(K.achiev, updated)
    }

    // ── User XP + streak ──
    const prevXp   = prevUser.xp || 0
    const prevLevel = getLevel(prevXp)
    const newXp    = prevXp + totalXp
    const newLevel = getLevel(newXp)
    const updUser  = { ...prevUser, xp: newXp, streak: newStreak }
    const updAllUsers = { ...allUsers, [currentId]: updUser }
    setAllUsers(updAllUsers); lsSet(K.users, updAllUsers)

    // ── History ──
    const record = { id: Date.now(), game, mode, score, won, p2Name, p2Score, isDaily, xpEarned: totalXp, date: Date.now() }
    const prevH  = allHistory[currentId] || []
    const newH   = [record, ...prevH].slice(0, 30)
    const updH   = { ...allHistory, [currentId]: newH }
    setAllHistory(updH); lsSet(K.history, updH)

    return { xpEarned: totalXp, leveledUp: newLevel > prevLevel, newLevel, unlocked }
  }, [currentId, allUsers, allScores, allAchiev, allHistory])

  // legacy compat: games that just call updateScore(game, score)
  const updateScore = useCallback((game, score, opts = {}) => {
    recordGame({ game, score, ...opts })
  }, [recordGame])

  return (
    <Ctx.Provider value={{
      user, scores, matchHistory, achievements,
      allUsers, allScores,
      createUser, loginAs, logout,
      recordGame, updateScore,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useUser = () => useContext(Ctx)
