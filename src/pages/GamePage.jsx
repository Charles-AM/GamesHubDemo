import { useParams, Navigate } from 'react-router-dom'
import { GAME_REGISTRY } from '../games/gameRegistry'
import VersusGame from './VersusGame'
import DailyGame  from './DailyGame'

export default function GamePage() {
  const { gameId, mode } = useParams()
  if (!GAME_REGISTRY[gameId]) return <Navigate to="/hub" />
  if (mode === 'versus') return <VersusGame gameId={gameId} />
  if (mode === 'daily')   return <DailyGame  gameId={gameId} />
  const GameComponent = GAME_REGISTRY[gameId].component
  return <GameComponent />
}
