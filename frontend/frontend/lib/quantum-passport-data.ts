export const LEARNER = {
  name: "Maya Chen",
  initials: "MC",
  rank: "Journeyman of Entanglement",
  level: 4,
  xp: 420,
  xpToNextLevel: 600,
  nextLevelLabel: "Quantum Architect",
  email: "maya.chen@quantumloop.dev",
  cohort: "Quantum Computing Fall 2026",
  batch: "Batch Alpha",
  streak: 12,
  bestStreak: 18,
}

export const WEEK_NODES = [
  { day: "Mon", completed: true },
  { day: "Tue", completed: true },
  { day: "Wed", completed: true },
  { day: "Thu", completed: true },
  { day: "Fri", completed: true },
  { day: "Sat", completed: false },
  { day: "Sun", completed: false },
] as const

export const HEATMAP_SUMMARY = {
  activeDays: 123,
  totalXp: 9060,
  streak: 12,
}

// Deterministic seeded PRNG so server and client renders match exactly (no hydration mismatch).
function mulberry32(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type HeatmapCell = {
  week: number
  day: number
  intensity: 0 | 1 | 2 | 3 | 4
  date: string
  label: string
  xp: number
  simulations: number
  isToday: boolean
}

const WEEKS = 52
const DAYS = 7
export const TODAY_ISO = "2026-09-23"

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function buildHeatmap(): HeatmapCell[] {
  const rand = mulberry32(20260101)
  const cells: HeatmapCell[] = []
  const today = new Date(2026, 8, 23)
  const start = new Date(today)
  start.setDate(start.getDate() - (WEEKS * DAYS - 1))

  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS; d++) {
      const index = w * DAYS + d
      const date = new Date(start)
      date.setDate(date.getDate() + index)
      const iso = date.toISOString().slice(0, 10)
      const roll = rand()
      let intensity: HeatmapCell["intensity"] = 0
      if (roll > 0.82) intensity = 4
      else if (roll > 0.65) intensity = 3
      else if (roll > 0.48) intensity = 2
      else if (roll > 0.3) intensity = 1
      const xp = intensity === 0 ? 0 : Math.round(intensity * 34 + rand() * 30)
      const simulations = intensity === 0 ? 0 : Math.round(intensity + rand() * 3)
      cells.push({
        week: w,
        day: d,
        intensity,
        date: iso,
        label: `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
        xp,
        simulations,
        isToday: iso === TODAY_ISO,
      })
    }
  }

  const last = cells[cells.length - 1]
  last.intensity = 3
  last.xp = 72
  last.simulations = 4

  return cells
}

export const HEATMAP_CELLS = buildHeatmap()

export type BadgeGlyphId =
  | "hadamard"
  | "bell"
  | "decoherence"
  | "socratic"
  | "oracle"
  | "interference"
  | "phase"
  | "unitary"

export type Badge = {
  id: string
  title: string
  description: string
  earned: boolean
  earnedDate?: string
  criteria?: string
  progress?: number
  glyph: BadgeGlyphId
}

export const BADGES: Badge[] = [
  {
    id: "hadamard-pioneer",
    title: "Hadamard Pioneer",
    description: "Placed your first Hadamard gate and observed a qubit enter superposition.",
    earned: true,
    earnedDate: "Mar 2, 2026",
    glyph: "hadamard",
  },
  {
    id: "bell-state-architect",
    title: "Bell State Architect",
    description: "Built and verified a maximally entangled Bell pair across two qubits.",
    earned: true,
    earnedDate: "Mar 19, 2026",
    glyph: "bell",
  },
  {
    id: "decoherence-defier",
    title: "Decoherence Defier",
    description: "Ran a circuit that survived simulated environmental noise above 90% fidelity.",
    earned: true,
    earnedDate: "Apr 8, 2026",
    glyph: "decoherence",
  },
  {
    id: "socratic-solver",
    title: "Socratic Solver",
    description: "Completed 10 Explain-stage debriefs with a perfect accuracy streak.",
    earned: true,
    earnedDate: "May 14, 2026",
    glyph: "socratic",
  },
  {
    id: "quantum-oracle",
    title: "Quantum Oracle",
    description: "Design and query a black-box oracle U_f across three different algorithms.",
    earned: false,
    criteria: "Complete the Deutsch\u2013Jozsa and Grover oracle stages with 100% accuracy.",
    progress: 40,
    glyph: "oracle",
  },
  {
    id: "interference-master",
    title: "Interference Master",
    description: "Demonstrate both constructive and destructive interference in a single notebook.",
    earned: false,
    criteria: "Reach Stage 6 (Observe) in three interference-based algorithms.",
    progress: 65,
    glyph: "interference",
  },
  {
    id: "phase-whisperer",
    title: "Phase Whisperer",
    description: "Master phase kickback and relative phase manipulation across gate sequences.",
    earned: false,
    criteria: "Score 90% or higher on the Phase Estimation challenge set.",
    progress: 20,
    glyph: "phase",
  },
  {
    id: "unitary-grandmaster",
    title: "Unitary Grandmaster",
    description: "Prove unitarity holds across every gate family in the curriculum.",
    earned: false,
    criteria: "Master all 6 core concepts to 90%+ and finish Batch Alpha.",
    progress: 55,
    glyph: "unitary",
  },
]

export const MASTERY_CONCEPTS = [
  { concept: "Superposition", value: 90 },
  { concept: "Single-Qubit Rotations", value: 85 },
  { concept: "Entanglement", value: 80 },
  { concept: "Measurement", value: 75 },
  { concept: "Deutsch\u2013Jozsa Oracle", value: 40 },
  { concept: "Grover Diffusion", value: 20 },
] as const

export const CALIBRATION_ROUNDS = [
  { round: "R1", accuracy: 52 },
  { round: "R2", accuracy: 64 },
  { round: "R3", accuracy: 71 },
  { round: "R4", accuracy: 78 },
  { round: "R5", accuracy: 85 },
  { round: "R6", accuracy: 91 },
  { round: "R7", accuracy: 94 },
] as const

export type TimelineStage =
  | "Predict"
  | "Build"
  | "Run"
  | "Observe"
  | "Explain"
  | "Debug"
  | "Challenge"
  | "Master"

export type TimelineEntry = {
  id: string
  algorithm: string
  stage: TimelineStage
  date: string
  accuracy: number
  xp: number
}

export const TIMELINE: TimelineEntry[] = [
  { id: "t1", algorithm: "Grover's Search", stage: "Observe", date: "Sep 22, 2026", accuracy: 94, xp: 60 },
  { id: "t2", algorithm: "Grover's Search", stage: "Explain", date: "Sep 21, 2026", accuracy: 88, xp: 45 },
  { id: "t3", algorithm: "Deutsch\u2013Jozsa", stage: "Debug", date: "Sep 18, 2026", accuracy: 76, xp: 40 },
  { id: "t4", algorithm: "Bell State Prep", stage: "Challenge", date: "Sep 15, 2026", accuracy: 100, xp: 80 },
  { id: "t5", algorithm: "Superposition Basics", stage: "Master", date: "Sep 10, 2026", accuracy: 97, xp: 100 },
]
