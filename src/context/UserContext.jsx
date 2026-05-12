import { createContext, useContext, useState } from 'react'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('arcadia_user')
    return saved ? JSON.parse(saved) : null
  })

  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem('arcadia_scores')
    return saved ? JSON.parse(saved) : {}
  })

  const login = (username) => {
    const userData = {
      username,
      id: Math.random().toString(36).substr(2, 9),
      joinedAt: Date.now(),
      isPremium: false,
    }
    setUser(userData)
    localStorage.setItem('arcadia_user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('arcadia_user')
  }

  const updateScore = (game, score) => {
    const updated = {
      ...scores,
      [game]: {
        best: Math.max(score, scores[game]?.best || 0),
        last: score,
        plays: (scores[game]?.plays || 0) + 1,
      },
    }
    setScores(updated)
    localStorage.setItem('arcadia_scores', JSON.stringify(updated))
  }

  return (
    <UserContext.Provider value={{ user, login, logout, scores, updateScore }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
