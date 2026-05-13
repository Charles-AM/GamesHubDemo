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

// ── Daily challenge ────────────────────────────────────────
const DAILY_ROTATION = ['mathblitz', 'wordle', 'snake', 'crossword', 'flags', 'wordsearch', 'snake']
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
  const [authUser,           setAuthUser]           = useState(null)
  const [profile,            setProfile]            = useState(null)
  const [scores,             setScores]             = useState({})
  const [matchHistory,       setMatchHistory]       = useState([])
  const [loading,            setLoading]            = useState(true)
  const [needsProfile,       setNeedsProfile]       = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [levelUpInfo,        setLevelUpInfo]        = useState(null) // { newLevel } when leveled up

  // Refs so recordGame callbacks never go stale
  const scoresRef      = useRef({})
  const profileRef     = useRef(null)
  const authUserRef    = useRef(null)

  useEffect(() => { scoresRef.current   = scores  }, [scores])
  useEffect(() => { profileRef.current  = profile }, [profile])
  useEffect(() => { authUserRef.current = authUser }, [authUser])

  // ── Load all cloud data for a user ─────────────────────
  const loadUserData = useCallback(async (uid) => {
    const [profRes, scoresRes, histRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('scores').select('*').eq('user_id', uid),
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
          setProfile(null); setScores({}); setMatchHistory([])
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
          setProfile(null); setScores({}); setMatchHistory([])
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
    if (mode === 'versus') xpEarned += won === true ? 60 : won === false ? 20 : 40 // win/loss/draw
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

    // Profile XP + streak (optimistic)
    const prevLevel = getLevel(prof.xp)
    const newXp    = prof.xp + xpEarned
    const newLevel = getLevel(newXp)
    setProfile(p => ({ ...p, xp: newXp, streak_count: newStreakCount, streak_last_date: today }))
    if (newLevel > prevLevel) setLevelUpInfo({ newLevel })

    // Match history (optimistic)
    const record = { id: Date.now(), game, mode, score, won, p2Name, p2Score, isDaily, xpEarned, date: Date.now() }
    setMatchHistory(h => [record, ...h].slice(0, 30))

    // ── Background sync to Supabase (each fails independently) ───
    supabase.from('scores').upsert({
      user_id: uid, game,
      best: newGame.best, last_score: newGame.last,
      plays: newGame.plays,
    }, { onConflict: 'user_id,game' }).catch(() => {})

    supabase.from('profiles').update({
      xp: newXp, streak_count: newStreakCount, streak_last_date: today,
    }).eq('id', uid).catch(() => {})

    // Insert match — core fields only so it always succeeds regardless of schema
    supabase.from('matches').insert({
      user_id: uid, game, mode, score, won,
    }).catch(() => {})

    return { xpEarned, leveledUp: newLevel > prevLevel, newLevel }
  }, [])

  // Legacy compat — games call updateScore(game, score)
  const updateScore = useCallback((game, score, opts = {}) => {
    recordGame({ game, score, ...opts })
  }, [recordGame])

  const user = profileToUser(profile)

  const clearLevelUp = () => setLevelUpInfo(null)

  return (
    <Ctx.Provider value={{
      user, scores, matchHistory,
      loading, needsProfile, isPasswordRecovery,
      levelUpInfo, clearLevelUp,
      signUp, signIn, signOut, createProfile,
      sendPasswordReset, updatePassword, deleteAccount,
      recordGame, updateScore,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useUser = () => useContext(Ctx)
