import MathBlitzGame  from './mathblitz/MathBlitzGame'
import ArcheryGame    from './archery/ArcheryGame'
import WordSearchGame from './wordsearch/WordSearchGame'
import CrosswordGame  from './crossword/CrosswordGame'
import FlagGame       from './flags/FlagGame'
import SnakeGame      from './snake/SnakeGame'
import CelebGame      from './celeb/CelebGame'

export const GAME_REGISTRY = {
  mathblitz: {
    id: 'mathblitz', component: MathBlitzGame,
    label: 'MATH BLITZ', desc: 'Solve as many equations as you can in 60 seconds',
    icon: '⚡', tag: 'SPEED',
    color: '#00f5ff',
    gradient: 'linear-gradient(135deg, rgba(0,245,255,0.2), rgba(0,80,255,0.15))',
    border: 'rgba(0,245,255,0.45)',
    glow: 'rgba(0,245,255,0.18)',
  },
  archery: {
    id: 'archery', component: ArcheryGame,
    label: 'ARCHERY', desc: '10 shots, moving crosshair — beat the wind and hit bullseye',
    icon: '🏹', tag: 'AIM',
    color: '#ffd700',
    gradient: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,0,0.15))',
    border: 'rgba(255,215,0,0.45)',
    glow: 'rgba(255,215,0,0.18)',
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
  snake: {
    id: 'snake', component: SnakeGame,
    label: 'SNAKE', desc: 'Eat food, grow longer, don\'t crash — 60 seconds',
    icon: '🐍', tag: 'ARCADE',
    color: '#00ff88',
    gradient: 'linear-gradient(135deg, rgba(0,255,136,0.18), rgba(0,160,80,0.12))',
    border: 'rgba(0,255,136,0.45)',
    glow: 'rgba(0,255,136,0.18)',
  },
  celeb: {
    id: 'celeb', component: CelebGame,
    label: 'WHO AM I?', desc: 'Guess the celebrity from clues — movies, sports, music & more',
    icon: '🌟', tag: 'TRIVIA',
    color: '#bf00ff',
    gradient: 'linear-gradient(135deg, rgba(191,0,255,0.2), rgba(80,0,180,0.15))',
    border: 'rgba(191,0,255,0.45)',
    glow: 'rgba(191,0,255,0.18)',
  },
}

export const GAME_LIST = Object.values(GAME_REGISTRY)
