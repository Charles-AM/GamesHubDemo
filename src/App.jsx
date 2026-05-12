import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import UserSetup   from './pages/UserSetup'
import Hub         from './pages/Hub'
import Profile     from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import GamePage    from './pages/GamePage'
import BottomNav   from './components/BottomNav'

const NAV_ROUTES = ['/hub', '/profile', '/leaderboard']

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-4xl animate-pulse">🕹️</div>
      <p className="font-orbitron text-xs text-gray-500 tracking-widest animate-pulse">LOADING...</p>
    </div>
  )
}

function Layout() {
  const location = useLocation()
  const showNav  = NAV_ROUTES.includes(location.pathname)
  return (
    <>
      <div style={{ paddingBottom: showNav ? 72 : 0 }}>
        <AppRoutes />
      </div>
      {showNav && <BottomNav />}
    </>
  )
}

function AppRoutes() {
  const { user, loading, needsProfile } = useUser()

  if (loading) return <LoadingScreen />

  // Authenticated but no profile yet → finish setup
  const setupNeeded = !user || needsProfile

  return (
    <Routes>
      <Route path="/"            element={setupNeeded ? <UserSetup /> : <Navigate to="/hub" />} />
      <Route path="/hub"         element={setupNeeded ? <Navigate to="/" /> : <Hub />} />
      <Route path="/profile"     element={setupNeeded ? <Navigate to="/" /> : <Profile />} />
      <Route path="/leaderboard" element={setupNeeded ? <Navigate to="/" /> : <Leaderboard />} />
      <Route path="/game/:gameId/:mode" element={setupNeeded ? <Navigate to="/" /> : <GamePage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <div className="scanlines grid-bg min-h-screen">
          <Layout />
        </div>
      </BrowserRouter>
    </UserProvider>
  )
}
