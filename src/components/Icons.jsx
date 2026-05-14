/**
 * Icon library — consistent SVG icons throughout ArcadiaDuels.
 *
 * All icons: viewBox 0 0 24 24, strokeWidth 1.5, round caps/joins, fill="none" by default.
 * Usage:
 *   <GameIcon id="shooter"    size={24} color="#00f5ff" />
 *   <NavIcon  name="battle"   size={20} color="#aaa" />
 *   <DiffIcon level="easy"    size={20} color="#00ff88" />
 *   <Icon     name="trophy"   size={20} color="#ffd700" />
 */

const SVG = ({ size, color, strokeWidth = 1.5, children, className = '' }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true">
    {children}
  </svg>
)

/* ── Game Icons ──────────────────────────────────────────────────────────────── */

const GAME_ICONS = {
  wordwalk: ({ c }) => (
    <>
      {/* Roof */}
      <polyline points="2,13 12,3 22,13" />
      {/* Walls */}
      <path d="M4 13v8h16v-8" />
      {/* Door */}
      <path d="M9 21v-5h6v5" />
    </>
  ),

  shooter: ({ c }) => (
    <>
      {/* Body */}
      <path d="M12 2c2.5 3 3.5 7.5 3.5 11.5L12 17l-3.5-3.5C8.5 9.5 9.5 5 12 2Z" />
      {/* Porthole */}
      <circle cx="12" cy="9" r="1.8" />
      {/* Fins */}
      <path d="M8.5 13.5L5 19M15.5 13.5L19 19" />
      {/* Exhaust flame */}
      <path d="M10 17q2 4 4 0" />
    </>
  ),

  runner: ({ c }) => (
    <>
      {/* Head */}
      <circle cx="16" cy="4" r="2.2" />
      {/* Torso leaning forward */}
      <path d="M16 6.2L13 13" />
      {/* Arms */}
      <path d="M15 9.5l4-2.5" />
      <path d="M14 10.5L9.5 13" />
      {/* Legs */}
      <path d="M13 13l3.5 5 4 4.5" />
      <path d="M13 13l-2.5 5L8 22" />
      {/* Speed streaks */}
      <path d="M1 9.5h5M1 13h4M1 16.5h3" strokeOpacity="0.35" />
    </>
  ),

  fruitslash: ({ c }) => (
    <>
      {/* Blade 1: top-left → bottom-right */}
      <path d="M4 4L20 20" />
      <path d="M4 4L1.5 6.5L4.5 9.5" />
      {/* Blade 2: top-right → bottom-left */}
      <path d="M20 4L4 20" />
      <path d="M20 4L22.5 6.5L19.5 9.5" />
      {/* Slash sparks */}
      <path d="M10.5 3L12.5 5" strokeOpacity="0.45" />
      <path d="M11.5 19L13.5 21" strokeOpacity="0.45" />
    </>
  ),

  archery: ({ c }) => (
    <>
      {/* Bow arc */}
      <path d="M7 4Q2 12 7 20" />
      {/* String */}
      <line x1="7" y1="4" x2="7" y2="20" />
      {/* Arrow shaft */}
      <line x1="7" y1="12" x2="21" y2="12" />
      {/* Arrowhead */}
      <path d="M18 9l3 3-3 3" />
      {/* Fletching */}
      <path d="M7.5 10.5L4.5 8.5M7.5 13.5L4.5 15.5" />
    </>
  ),

  snake: ({ c }) => (
    <>
      {/* S-curve body */}
      <path d="M5 20Q3 15 7 11.5Q11 8 13 11.5Q15 15 18.5 11Q22 7 19.5 4" />
      {/* Head */}
      <circle cx="19.5" cy="3.5" r="1.8" fill={c} stroke="none" />
      {/* Tongue */}
      <path d="M20.8 3L22.5 1.5M20.8 3L22.5 4.5" strokeWidth="1" />
    </>
  ),

  celeb: ({ c }) => (
    <>
      {/* 5-pointed star */}
      <path d="M12 2l2.5 7.5H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4.5 2.4-7.5L2 9.5h7.5L12 2Z" />
    </>
  ),

  crossword: ({ c }) => (
    <>
      {/* Border */}
      <rect x="2" y="2" width="20" height="20" rx="1.5" />
      {/* Grid lines */}
      <line x1="9" y1="2" x2="9" y2="22" />
      <line x1="15" y1="2" x2="15" y2="22" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="2" y1="15" x2="22" y2="15" />
      {/* Blocked squares */}
      <rect x="2.75" y="2.75" width="5.5" height="5.5" fill={c} stroke="none" opacity="0.85" rx="0.5" />
      <rect x="15.75" y="15.75" width="5.5" height="5.5" fill={c} stroke="none" opacity="0.85" rx="0.5" />
      <rect x="15.75" y="2.75" width="5.5" height="5.5" fill={c} stroke="none" opacity="0.3" rx="0.5" />
    </>
  ),

  wordsearch: ({ c }) => (
    <>
      {/* Lens */}
      <circle cx="10" cy="10" r="7" />
      {/* Handle */}
      <line x1="15.5" y1="15.5" x2="21.5" y2="21.5" strokeWidth="2" />
      {/* Letter rows inside */}
      <line x1="6" y1="8"  x2="14" y2="8"  strokeWidth="1.2" opacity="0.5" />
      <line x1="6" y1="11" x2="12" y2="11" strokeWidth="1.2" opacity="0.5" />
      <line x1="6" y1="14" x2="13" y2="14" strokeWidth="1.2" opacity="0.5" />
    </>
  ),

  flags: ({ c }) => (
    <>
      {/* Pole */}
      <line x1="4" y1="3" x2="4" y2="21" />
      {/* Waving flag */}
      <path d="M4 3Q8 5.5 12 3Q16 .5 20 3V13Q16 15.5 12 13Q8 10.5 4 13V3Z" />
    </>
  ),

  pong: ({ c }) => (
    <>
      {/* Center divider */}
      <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="3 3" strokeOpacity="0.4" />
      {/* Top paddle (AI) */}
      <rect x="7" y="3" width="10" height="3" rx="1.5" fill={c} stroke="none" opacity="0.6" />
      {/* Bottom paddle (player) */}
      <rect x="7" y="18" width="10" height="3" rx="1.5" fill={c} stroke="none" />
      {/* Ball */}
      <circle cx="15" cy="9" r="2.2" fill={c} stroke="none" />
    </>
  ),

  hoops: ({ c }) => (
    <>
      {/* Backboard */}
      <rect x="17" y="2" width="5" height="7" rx="0.5" />
      {/* Pole */}
      <line x1="19.5" y1="9" x2="19.5" y2="22" />
      {/* Arm */}
      <line x1="17" y1="5.5" x2="13" y2="5.5" />
      {/* Rim */}
      <path d="M6 6h14" />
      {/* Net */}
      <path d="M6 6Q6 12 10 14Q14 12 20 6" strokeWidth="1.2" />
      <line x1="13" y1="6" x2="12" y2="14" strokeWidth="1.2" />
      {/* Ball */}
      <circle cx="5" cy="18" r="4" />
      <path d="M2 18q3-3 6 0" strokeWidth="1" />
      <path d="M1.5 15.5Q5 14 8.5 15.5" strokeWidth="1" />
    </>
  ),
}

export function GameIcon({ id, size = 24, color = 'currentColor', strokeWidth = 1.5, className }) {
  const Paths = GAME_ICONS[id]
  if (!Paths) return null
  return (
    <SVG size={size} color={color} strokeWidth={strokeWidth} className={className}>
      <Paths c={color} />
    </SVG>
  )
}

/* ── Navigation Icons ────────────────────────────────────────────────────────── */

const NAV_ICONS = {
  hub: ({ c }) => (
    <>
      <rect x="2"  y="2"  width="9" height="9" rx="1.5" />
      <rect x="13" y="2"  width="9" height="9" rx="1.5" />
      <rect x="2"  y="13" width="9" height="9" rx="1.5" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" />
    </>
  ),

  battle: ({ c }) => (
    <>
      {/* Sword 1: top-right → bottom-left */}
      <path d="M20 4L4 20" />
      <path d="M20 4l2.5 2-2.5 4" />
      <path d="M4 20l-2.5-2 2.5-4" />
      {/* Sword 2: top-left → bottom-right */}
      <path d="M4 4L20 20" />
      <path d="M4 4L1.5 6 4 10" />
      <path d="M20 20l2.5-2L20 14" />
    </>
  ),

  profile: ({ c }) => (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
}

export function NavIcon({ name, size = 24, color = 'currentColor', strokeWidth = 1.5, className }) {
  const Paths = NAV_ICONS[name]
  if (!Paths) return null
  return (
    <SVG size={size} color={color} strokeWidth={strokeWidth} className={className}>
      <Paths c={color} />
    </SVG>
  )
}

/* ── Difficulty Icons ────────────────────────────────────────────────────────── */

const DIFF_ICONS = {
  easy: ({ c }) => (
    <>
      {/* Stem */}
      <line x1="12" y1="22" x2="12" y2="13" />
      {/* Left leaf */}
      <path d="M12 17Q8 15 6.5 11Q10.5 10 12 15" />
      {/* Right leaf */}
      <path d="M12 13Q15.5 11 17.5 8Q14 7.5 12 13" />
    </>
  ),

  medium: ({ c }) => (
    <>
      <path d="M13 2L5.5 13H11L10 22L18.5 11H13L14 2Z" />
    </>
  ),

  hard: ({ c }) => (
    <>
      {/* Skull cranium */}
      <path d="M7.5 16.5V20h9v-3.5M5 14.5Q5 7 12 7Q19 7 19 14.5Q19 18 16.5 18H7.5Q5 18 5 14.5Z" />
      {/* Eye sockets */}
      <circle cx="9.5"  cy="13.5" r="2" fill={c} stroke="none" />
      <circle cx="14.5" cy="13.5" r="2" fill={c} stroke="none" />
      {/* Teeth */}
      <line x1="9.5"  y1="20" x2="9.5"  y2="22" />
      <line x1="12"   y1="20" x2="12"   y2="22" />
      <line x1="14.5" y1="20" x2="14.5" y2="22" />
    </>
  ),
}

export function DiffIcon({ level, size = 24, color = 'currentColor', strokeWidth = 1.5, className }) {
  const Paths = DIFF_ICONS[level]
  if (!Paths) return null
  return (
    <SVG size={size} color={color} strokeWidth={strokeWidth} className={className}>
      <Paths c={color} />
    </SVG>
  )
}

/* ── General UI Icons ────────────────────────────────────────────────────────── */

const UI_ICONS = {
  trophy: ({ c }) => (
    <>
      <path d="M8 2h8v12q0 6-4 6q-4 0-4-6V2Z" />
      <path d="M8 5Q4 5 4 9q0 4 4 4" />
      <path d="M16 5q4 0 4 4q0 4-4 4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="7"  y1="22" x2="17" y2="22" />
    </>
  ),

  crown: ({ c }) => (
    <>
      <path d="M2 19L4.5 11 8.5 15.5 12 7l3.5 8.5 4-4.5L22 19H2Z" />
      <line x1="2" y1="19" x2="22" y2="19" />
    </>
  ),

  copy: ({ c }) => (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4Q2 15 2 13V4Q2 2 4 2H13Q15 2 15 4V5" />
    </>
  ),

  key: ({ c }) => (
    <>
      <circle cx="8" cy="11" r="5" />
      <path d="M13 11h9M18 9v4M21 9v4" strokeWidth="1.8" />
    </>
  ),

  controller: ({ c }) => (
    <>
      <rect x="2" y="7" width="20" height="12" rx="4" />
      {/* D-pad left button */}
      <path d="M8 13V11M7 12H9" />
      {/* Right buttons */}
      <circle cx="14" cy="11.5" r="1" fill={c} stroke="none" />
      <circle cx="17" cy="11.5" r="1" fill={c} stroke="none" />
    </>
  ),

  plus: ({ c }) => (
    <>
      <line x1="12" y1="5"  x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </>
  ),

  refresh: ({ c }) => (
    <>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.5 9A9 9 0 0 1 20 7l3 3" />
      <path d="M20.5 15A9 9 0 0 1 4 17l-3-3" />
    </>
  ),

  home: ({ c }) => (
    <>
      <polyline points="2,13 12,3 22,13" />
      <path d="M4 13v8h16v-8" />
      <path d="M9 21v-5h6v5" />
    </>
  ),

  swords: ({ c }) => (
    <>
      <path d="M20 4L4 20" />
      <path d="M20 4l2.5 2-2.5 4" />
      <path d="M4 20l-2.5-2 2.5-4" />
      <path d="M4 4L20 20" />
      <path d="M4 4L1.5 6 4 10" />
      <path d="M20 20l2.5-2L20 14" />
    </>
  ),

  check: ({ c }) => (
    <>
      <polyline points="20,6 9,17 4,12" />
    </>
  ),

  x: ({ c }) => (
    <>
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </>
  ),

  share: ({ c }) => (
    <>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16,6 12,2 8,6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </>
  ),

  person: ({ c }) => (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
}

export function Icon({ name, size = 24, color = 'currentColor', strokeWidth = 1.5, className }) {
  const Paths = UI_ICONS[name]
  if (!Paths) return null
  return (
    <SVG size={size} color={color} strokeWidth={strokeWidth} className={className}>
      <Paths c={color} />
    </SVG>
  )
}
