import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import UserSetup    from './pages/UserSetup'
import Hub          from './pages/Hub'
import Profile      from './pages/Profile'
import GamePage     from './pages/GamePage'
import GameRoom     from './pages/GameRoom'
import Admin        from './pages/Admin'
import BottomNav    from './components/BottomNav'
import LevelUpToast from './components/LevelUpToast'

const NAV_ROUTES = ['/hub', '/profile', '/room']

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
  const { user, loading, needsProfile, isPasswordRecovery } = useUser()

  if (loading) return <LoadingScreen />

  const setupNeeded = !user || needsProfile || isPasswordRecovery

  return (
    <Routes>
      <Route path="/"                    element={setupNeeded ? <UserSetup /> : <Navigate to="/hub" />} />
      <Route path="/hub"                 element={setupNeeded ? <Navigate to="/" /> : <Hub />} />
      <Route path="/profile"             element={setupNeeded ? <Navigate to="/" /> : <Profile />} />
      <Route path="/game/:gameId/:mode"  element={setupNeeded ? <Navigate to="/" /> : <GamePage />} />
      <Route path="/room"                element={setupNeeded ? <Navigate to="/" /> : <GameRoom />} />
      <Route path="/admin"              element={<Admin />} />
      <Route path="*"                    element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <div className="scanlines grid-bg min-h-screen">
          {/* Constrain to mobile width on desktop, centred */}
          <div className="relative mx-auto min-h-screen" style={{ maxWidth: 480 }}>
            <LevelUpToast />
            <Layout />
          </div>
        </div>
      </BrowserRouter>
    </UserProvider>
  )
}
