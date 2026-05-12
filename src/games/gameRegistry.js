import TriviaGame    from './trivia/TriviaGame'
import WordleGame    from './wordle/WordleGame'
import WordSearchGame from './wordsearch/WordSearchGame'
import CrosswordGame from './crossword/CrosswordGame'
import FlagGame      from './flags/FlagGame'

export const GAME_REGISTRY = {
  trivia: {
    id: 'trivia', component: TriviaGame,
    label: 'TRIVIA QUIZ', desc: 'Race through 10 questions as fast as you can',
    icon: '🧠', tag: 'KNOWLEDGE',
    color: '#00f5ff',
    gradient: 'linear-gradient(135deg, rgba(0,245,255,0.2), rgba(0,80,255,0.15))',
    border: 'rgba(0,245,255,0.45)',
    glow: 'rgba(0,245,255,0.18)',
  },
  wordle: {
    id: 'wordle', component: WordleGame,
    label: 'WORDLE DUEL', desc: 'Guess the 5-letter word in fewest tries',
    icon: '🔤', tag: 'WORD',
    color: '#00ff88',
    gradient: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,180,80,0.15))',
    border: 'rgba(0,255,136,0.45)',
    glow: 'rgba(0,255,136,0.18)',
  },
  crossword: {
    id: 'crossword', component: CrosswordGame,
    label: 'CROSSWORD', desc: 'Fill the 5×5 grid before time runs out',
    icon: '✏️', tag: 'PUZZLE',
    color: '#ffd700',
    gradient: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,0,0.15))',
    border: 'rgba(255,215,0,0.45)',
    glow: 'rgba(255,215,0,0.18)',
  },
  wordsearch: {
    id: 'wordsearch', component: WordSearchGame,
    label: 'WORD SEARCH', desc: 'Find all hidden words before time runs out',
    icon: '🔍', tag: 'SEARCH',
    color: '#ff006e',
    gradient: 'linear-gradient(135deg, rgba(255,0,110,0.2), rgba(180,0,200,0.15))',
    border: 'rgba(255,0,110,0.45)',
    glow: 'rgba(255,0,110,0.18)',
  },
  flags: {
    id: 'flags', component: FlagGame,
    label: 'FLAG FRENZY', desc: 'Match flags to countries before the clock hits zero',
    icon: '🌍', tag: 'GEOGRAPHY',
    color: '#bf00ff',
    gradient: 'linear-gradient(135deg, rgba(191,0,255,0.2), rgba(80,0,200,0.15))',
    border: 'rgba(191,0,255,0.45)',
    glow: 'rgba(191,0,255,0.18)',
  },
}

export const GAME_LIST = Object.values(GAME_REGISTRY)
