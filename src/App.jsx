import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import UserSetup from './pages/UserSetup'
import Hub from './pages/Hub'
import GamePage from './pages/GamePage'

function AppRoutes() {
  const { user } = useUser()
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/hub" /> : <UserSetup />} />
      <Route path="/hub" element={user ? <Hub /> : <Navigate to="/" />} />
      <Route path="/game/:gameId/:mode" element={user ? <GamePage /> : <Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <div className="scanlines grid-bg min-h-screen">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </UserProvider>
  )
}