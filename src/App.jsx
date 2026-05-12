import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import UserSetup   from './pages/UserSetup'
import Hub         from './pages/Hub'
import Profile     from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import GamePage    from './pages/GamePage'
import BottomNav   from './components/BottomNav'

const NAV_ROUTES = ['/hub', '/profile', '/leaderboard']

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
  const { user } = useUser()
  return (
    <Routes>
      <Route path="/"             element={user ? <Navigate to="/hub" /> : <UserSetup />} />
      <Route path="/hub"          element={user ? <Hub />         : <Navigate to="/" />} />
      <Route path="/profile"      element={user ? <Profile />     : <Navigate to="/" />} />
      <Route path="/leaderboard"  element={user ? <Leaderboard /> : <Navigate to="/" />} />
      <Route path="/game/:gameId/:mode" element={user ? <GamePage /> : <Navigate to="/" />} />
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
