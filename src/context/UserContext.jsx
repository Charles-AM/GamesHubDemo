import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Read recovery flag captured before Supabase cleared the hash
const wasRecoveryLink = sessionStorage.getItem('arcadia_recovery') === '1'

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

// ── Helpers ────────────────────────────────────────────────
function rowsToScores(rows = []) {
  const obj = {}
  for (const s of rows) {
    obj[s.game] = { best: s.best, last: s.last_score, plays: s.plays, wins: s.wins, losses: s.losses }
  }
  return obj
}

function rowToMatch(m) {
  return {
    id: m.id, game: m.game, mode: m.mode, score: m.score, won: m.won,
    p2Name: m.p2_name, p2Score: m.p2_score, isDaily: m.is_daily,
    xpEarned: m.xp_earned, date: new Date(m.played_at).getTime(),
  }
}

function profileToUser(p) {
  if (!p) return null
  return {
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    xp: p.xp,
    streak: { count: p.streak_count, lastDate: p.streak_last_date },
    joinedAt: new Date(p.joined_at).getTime(),
  }
}

// ── Provider ───────────────────────────────────────────────
export function UserProvider({ children }) {
  const [authUser,          setAuthUser]          = useState(null)
  const [profile,           setProfile]           = useState(null)
  const [scores,            setScores]            = useState({})
  const [matchHistory,      setMatchHistory]      = useState([])
  const [achievements,      setAchievements]      = useState([])
  const [loading,           setLoading]           = useState(true)
  const [needsProfile,      setNeedsProfile]      = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  // Refs so recordGame callbacks never go stale
  const scoresRef      = useRef({})
  const achievRef      = useRef([])
  const profileRef     = useRef(null)
  const authUserRef    = useRef(null)

  useEffect(() => { scoresRef.current   = scores       }, [scores])
  useEffect(() => { achievRef.current   = achievements }, [achievements])
  useEffect(() => { profileRef.current  = profile      }, [profile])
  useEffect(() => { authUserRef.current = authUser     }, [authUser])

  // ── Load all cloud data for a user ─────────────────────
  const loadUserData = useCallback(async (uid) => {
    const [profRes, scoresRes, achievRes, histRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('scores').select('*').eq('user_id', uid),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', uid),
      supabase.from('matches').select('*').eq('user_id', uid)
        .order('played_at', { ascending: false }).limit(30),
    ])

    if (profRes.error || !profRes.data) {
      setNeedsProfile(true)
      setLoading(false)
      return
    }

    setProfile(profRes.data)
    setNeedsProfile(false)
    setScores(rowsToScores(scoresRes.data))
    setAchievements((achievRes.data || []).map(a => a.achievement_id))
    setMatchHistory((histRes.data || []).map(rowToMatch))
    setLoading(false)
  }, [])

  // ── Auth state listener ─────────────────────────────────
  useEffect(() => {
    let mounted = true

    // Safety net — never hang on loading screen
    const safetyTimer = setTimeout(() => { if (mounted) setLoading(false) }, 5000)

    const isRecoveryLink = wasRecoveryLink

    if (isRecoveryLink) {
      // Recovery link: let onAuthStateChange handle everything — don't call getSession
      // (getSession would navigate the user to hub before recovery state is set)
    } else {
      // Normal load: fast session check with 4s timeout
      const sessionTimeout = new Promise(res => setTimeout(() => res({ data: { session: null } }), 4000))
      Promise.race([supabase.auth.getSession(), sessionTimeout]).then(async ({ data: { session } }) => {
        if (!mounted) return
        const u = session?.user || null
        setAuthUser(u)
        if (u) await loadUserData(u.id)
        else {
          setProfile(null); setScores({}); setAchievements([]); setMatchHistory([])
          setNeedsProfile(false); setLoading(false)
        }
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return

        // INITIAL_SESSION or SIGNED_IN on a recovery link — show new-password screen
        if (isRecoveryLink && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          const u = session?.user || null
          setAuthUser(u)
          setIsPasswordRecovery(true)
          if (u) loadUserData(u.id) // no await — don't block Supabase's internal event loop
          else setLoading(false)
          return
        }

        if (event === 'INITIAL_SESSION') return // handled by getSession() above

        if (event === 'PASSWORD_RECOVERY') {
          const u = session?.user || null
          setAuthUser(u)
          setIsPasswordRecovery(true)
          if (u) loadUserData(u.id) // no await
          else setLoading(false)
          return
        }

        const u = session?.user || null
        setAuthUser(u)
        setIsPasswordRecovery(false)
        if (u) {
          loadUserData(u.id) // no await
        } else {
          setProfile(null); setScores({}); setAchievements([]); setMatchHistory([])
          setNeedsProfile(false); setLoading(false)
        }
      }
    )
    return () => { mounted = false; clearTimeout(safetyTimer); subscription.unsubscribe() }
  }, [loadUserData])

  // ── Auth actions ────────────────────────────────────────
  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data.user
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_user')
    if (error) throw error
    // Auth state listener will fire and clear everything
    await supabase.auth.signOut()
  }, [])

  const sendPasswordReset = useCallback(async (email) => {
    const redirectTo = `${window.location.origin}/`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    sessionStorage.removeItem('arcadia_recovery')
    setIsPasswordRecovery(false)
  }, [])

  const createProfile = useCallback(async (username, avatar = '🎮') => {
    // authUserRef may not be set yet if the auth state listener hasn't fired —
    // fall back to asking Supabase directly for the current session
    let uid = authUserRef.current?.id
    if (!uid) {
      const { data } = await supabase.auth.getUser()
      uid = data?.user?.id
    }
    if (!uid) throw new Error('Not authenticated — please sign in again')
    const { data, error } = await supabase.from('profiles').insert({
      id: uid, username, avatar,
      xp: 0, streak_count: 0, streak_last_date: null,
    }).select().single()
    if (error) throw error
    setProfile(data)
    setNeedsProfile(false)
    return data
  }, [])

  // ── Record a game (optimistic + background sync) ───────
  const recordGame = useCallback(async ({
    game, score,
    mode = 'solo', won = null,
    p2Name = null, p2Score = null,
    isDaily = false, wordle_tries = null,
  }) => {
    let uid = authUserRef.current?.id
    if (!uid) {
      const { data } = await supabase.auth.getUser()
      uid = data?.user?.id
    }
    const prof = profileRef.current
    if (!uid || !prof) return {}

    // XP
    let xpEarned = 10 + Math.floor(score / 20)
    if (mode === 'versus') xpEarned += won ? 60 : 20
    if (isDaily) xpEarned = Math.floor(xpEarned * 2)

    // Scores (optimistic)
    const prev = scoresRef.current[game] || { best: 0, last: 0, plays: 0, wins: 0, losses: 0 }
    const newGame = {
      best:   Math.max(score, prev.best),
      last:   score,
      plays:  prev.plays + 1,
      wins:   prev.wins   + (mode === 'versus' && won        ? 1 : 0),
      losses: prev.losses + (mode === 'versus' && won === false ? 1 : 0),
    }
    const newScores = { ...scoresRef.current, [game]: newGame }
    setScores(newScores)

    // Streak (optimistic)
    const today = todayKey()
    let newStreakCount = prof.streak_count
    if (prof.streak_last_date !== today) {
      const d = new Date(); d.setDate(d.getDate() - 1)
      const yesterday = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      newStreakCount = prof.streak_last_date === yesterday ? prof.streak_count + 1 : 1
    }

    // Achievements (optimistic)
    const prevSet  = new Set(achievRef.current)
    const newSet   = new Set(prevSet)
    const unlocked = []
    const totPlays = Object.values(newScores).reduce((a, s) => a + s.plays, 0)
    const totWins  = Object.values(newScores).reduce((a, s) => a + (s.wins || 0), 0)
    const gamesSet = new Set(Object.keys(newScores))

    const chk = (id, cond) => {
      if (cond && !newSet.has(id)) { newSet.add(id); unlocked.push(id) }
    }
    chk('first_game',  true)
    chk('vs_first',    mode === 'versus')
    chk('vs_win',      mode === 'versus' && won)
    chk('vs_5wins',    totWins >= 5)
    chk('vs_10wins',   totWins >= 10)
    chk('plays_10',    totPlays >= 10)
    chk('plays_25',    totPlays >= 25)
    chk('plays_50',    totPlays >= 50)
    chk('all_games',   gamesSet.size >= 5)
    chk('trivia_700',  game === 'trivia' && score >= 700)
    chk('flags_500',   game === 'flags'  && score >= 500)
    chk('wordle_2',    game === 'wordle' && wordle_tries !== null && wordle_tries <= 2)
    chk('streak_3',    newStreakCount >= 3)
    chk('streak_7',    newStreakCount >= 7)
    chk('daily_done',  isDaily)

    const achievXp = unlocked.reduce((a, id) => a + (ACHIEVEMENTS.find(x => x.id === id)?.xp || 0), 0)
    const totalXp  = xpEarned + achievXp

    // Profile XP + streak (optimistic)
    const prevLevel = getLevel(prof.xp)
    const newXp    = prof.xp + totalXp
    const newLevel = getLevel(newXp)
    setProfile(p => ({ ...p, xp: newXp, streak_count: newStreakCount, streak_last_date: today }))
    if (unlocked.length > 0) setAchievements([...newSet])

    // Match history (optimistic)
    const record = { id: Date.now(), game, mode, score, won, p2Name, p2Score, isDaily, xpEarned: totalXp, date: Date.now() }
    setMatchHistory(h => [record, ...h].slice(0, 30))

    // ── Background sync to Supabase ─────────────────────
    Promise.all([
      supabase.from('scores').upsert({
        user_id: uid, game,
        best: newGame.best, last_score: newGame.last,
        plays: newGame.plays, wins: newGame.wins, losses: newGame.losses,
      }, { onConflict: 'user_id,game' }),

      supabase.from('profiles').update({
        xp: newXp, streak_count: newStreakCount, streak_last_date: today,
      }).eq('id', uid),

      supabase.from('matches').insert({
        user_id: uid, game, mode, score, won,
        p2_name: p2Name, p2_score: p2Score,
        is_daily: isDaily, xp_earned: totalXp,
      }),

      unlocked.length > 0
        ? supabase.from('user_achievements').upsert(
            unlocked.map(id => ({ user_id: uid, achievement_id: id })),
            { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
          )
        : null,
    ].filter(Boolean)).catch(err => console.error('Supabase sync error:', err))

    return { xpEarned: totalXp, leveledUp: newLevel > prevLevel, newLevel, unlocked }
  }, [])

  // Legacy compat — games call updateScore(game, score)
  const updateScore = useCallback((game, score, opts = {}) => {
    recordGame({ game, score, ...opts })
  }, [recordGame])

  const user = profileToUser(profile)

  return (
    <Ctx.Provider value={{
      user, scores, matchHistory, achievements,
      loading, needsProfile, isPasswordRecovery, authUser,
      signUp, signIn, signOut, createProfile,
      sendPasswordReset, updatePassword, deleteAccount,
      recordGame, updateScore,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useUser = () => useContext(Ctx)
