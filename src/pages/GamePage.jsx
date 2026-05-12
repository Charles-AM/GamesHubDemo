import { useParams, Navigate } from 'react-router-dom'
import TriviaGame from '../games/trivia/TriviaGame'

const GAMES = {
  trivia: TriviaGame,
}

export default function GamePage() {
  const { gameId, mode } = useParams()
  const GameComponent = GAMES[gameId]

  if (!GameComponent) return <Navigate to="/hub" />

  return <GameComponent mode={mode} />
}
