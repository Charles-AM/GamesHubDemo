import { useParams, Navigate } from 'react-router-dom'
import TriviaGame from '../games/trivia/TriviaGame'
import WordleGame from '../games/wordle/WordleGame'
import WordSearchGame from '../games/wordsearch/WordSearchGame'
import CrosswordGame from '../games/crossword/CrosswordGame'
import FlagGame from '../games/flags/FlagGame'
import VersusGame from './VersusGame'

const GAMES = {
  trivia:     TriviaGame,
  wordle:     WordleGame,
  wordsearch: WordSearchGame,
  crossword:  CrosswordGame,
  flags:      FlagGame,
}

export default function GamePage() {
  const { gameId, mode } = useParams()
  if (!GAMES[gameId]) return <Navigate to="/hub" />
  if (mode === 'versus') return <VersusGame gameId={gameId} />
  const GameComponent = GAMES[gameId]
  return <GameComponent />
}
