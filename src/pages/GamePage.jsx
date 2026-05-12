import { useParams, Navigate } from 'react-router-dom'
import TriviaGame from '../games/trivia/TriviaGame'
import WordleGame from '../games/wordle/WordleGame'
import WordSearchGame from '../games/wordsearch/WordSearchGame'
import CrosswordGame from '../games/crossword/CrosswordGame'
import FlagGame from '../games/flags/FlagGame'

const GAMES = {
  trivia:     TriviaGame,
  wordle:     WordleGame,
  wordsearch: WordSearchGame,
  crossword:  CrosswordGame,
  flags:      FlagGame,
}

export default function GamePage() {
  const { gameId, mode } = useParams()
  const GameComponent = GAMES[gameId]
  if (!GameComponent) return <Navigate to="/hub" />
  return <GameComponent mode={mode} />
}
