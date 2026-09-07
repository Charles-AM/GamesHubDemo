import { lazy } from 'react'

const PongGame       = lazy(() => import('./pong/PongGame'))
const WhackGame      = lazy(() => import('./whack/WhackGame'))
const SoccerGame     = lazy(() => import('./soccer/SoccerGame'))
const ArcheryGame    = lazy(() => import('./archery/ArcheryGame'))
const WordSearchGame = lazy(() => import('./wordsearch/WordSearchGame'))
const CrosswordGame  = lazy(() => import('./crossword/CrosswordGame'))
const FlagGame       = lazy(() => import('./flags/FlagGame'))
const SnakeGame      = lazy(() => import('./snake/SnakeGame'))
const CelebGame      = lazy(() => import('./celeb/CelebGame'))
const ShooterGame    = lazy(() => import('./shooter/ShooterGame'))
const RunnerGame     = lazy(() => import('./runner/RunnerGame'))
const FruitSlashGame = lazy(() => import('./fruitslash/FruitSlashGame'))

export const GAME_REGISTRY = {
  pong: {
    id: 'pong', component: PongGame,
    label: 'PONG VS AI', desc: 'First to 7 wins — rally the ball, read the AI, dominate',
    tag: 'CLASSIC',
    color: '#00f5ff',
    gradient: 'linear-gradient(135deg, rgba(0,245,255,0.18), rgba(0,80,200,0.15))',
    border: 'rgba(0,245,255,0.45)',
    glow: 'rgba(0,245,255,0.18)',
  },
  soccer: {
    id: 'soccer', component: SoccerGame,
    label: 'PENALTY SHOOTOUT', desc: 'Swipe to place your shot — beat the keeper, score as many as you can',
    tag: 'SPORT',
    color: '#00ff88',
    gradient: 'linear-gradient(135deg, rgba(0,255,136,0.18), rgba(0,160,80,0.12))',
    border: 'rgba(0,255,136,0.45)',
    glow: 'rgba(0,255,136,0.18)',
  },
  whack: {
    id: 'whack', component: WhackGame,
    label: 'WHACK-A-MOLE', desc: 'Tap moles before they vanish — combo multipliers, bombs to dodge, 60 seconds',
    tag: 'REFLEX',
    color: '#00f5ff',
    gradient: 'linear-gradient(135deg, rgba(0,245,255,0.18), rgba(0,80,200,0.15))',
    border: 'rgba(0,245,255,0.45)',
    glow: 'rgba(0,245,255,0.18)',
  },
  shooter: {
    id: 'shooter', component: ShooterGame,
    label: 'SPACE SHOOTER', desc: 'Dodge and destroy enemies in deep space — 60 seconds',
    icon: '🚀', tag: 'ACTION',
    color: '#00f5ff',
    gradient: 'linear-gradient(135deg, rgba(0,245,255,0.18), rgba(0,60,200,0.15))',
    border: 'rgba(0,245,255,0.45)',
    glow: 'rgba(0,245,255,0.18)',
  },
  runner: {
    id: 'runner', component: RunnerGame,
    label: 'NEON RUNNER', desc: 'Jump, duck and dodge through a cyberpunk city',
    icon: '🏃', tag: 'RUNNER',
    color: '#00ff88',
    gradient: 'linear-gradient(135deg, rgba(0,255,136,0.18), rgba(0,160,80,0.12))',
    border: 'rgba(0,255,136,0.45)',
    glow: 'rgba(0,255,136,0.18)',
  },
  fruitslash: {
    id: 'fruitslash', component: FruitSlashGame,
    label: 'FRUIT SLASH', desc: 'Swipe to slash fruit — build combos, avoid the bombs',
    icon: '🍉', tag: 'SLASH',
    color: '#ff006e',
    gradient: 'linear-gradient(135deg, rgba(255,0,110,0.18), rgba(180,0,80,0.12))',
    border: 'rgba(255,0,110,0.45)',
    glow: 'rgba(255,0,110,0.18)',
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
