export type MasteryStatus = "On Track" | "At-Risk" | "Inactive"
export type Batch = "A" | "B"

export interface ConceptMastery {
  concept: string
  mastery: number
  misconception?: string
}

export interface PredictLogEntry {
  concept: string
  result: "correct" | "wrong"
  timestamp: string
}

export interface DebugScenario {
  title: string
  result: "solved" | "failed" | "in progress"
  timestamp: string
}

export interface ContestEntry {
  name: string
  placement: string
  xp: number
}

export interface ForumActivity {
  threadsStarted: number
  upvotedAnswers: number
  reputation: number
}

export interface Student {
  id: string
  name: string
  email: string
  batch: Batch
  mastery: number
  status: MasteryStatus
  xp: number
  streak: number
  predictAccuracy: number
  debugAttempts: number
  contestXp: number
  concepts: ConceptMastery[]
  predictLog: PredictLogEntry[]
  debugScenarios: DebugScenario[]
  contests: ContestEntry[]
  forum: ForumActivity
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

export const students: Student[] = [
  {
    id: "aisha-rahman",
    name: "Aisha Rahman",
    email: "aisha.rahman@quantumloop.edu",
    batch: "A",
    mastery: 42,
    status: "At-Risk",
    xp: 1280,
    streak: 2,
    predictAccuracy: 51,
    debugAttempts: 9,
    contestXp: 340,
    concepts: [
      { concept: "Superposition", mastery: 58, misconception: "Measurement collapses every qubit" },
      { concept: "Entanglement", mastery: 34, misconception: "Entanglement means faster-than-light signaling" },
      { concept: "Grover's Algorithm", mastery: 29 },
      { concept: "Noise & Error", mastery: 47 },
    ],
    predictLog: [
      { concept: "Entanglement — Bell state", result: "wrong", timestamp: "2 hrs ago" },
      { concept: "Superposition — H gate", result: "correct", timestamp: "1 day ago" },
      { concept: "Grover's Algorithm — Oracle", result: "wrong", timestamp: "3 days ago" },
    ],
    debugScenarios: [
      { title: "Fix phase kickback error", result: "failed", timestamp: "1 day ago" },
      { title: "Trace decoherence source", result: "in progress", timestamp: "4 days ago" },
    ],
    contests: [{ name: "Quantum Debug Sprint", placement: "#41", xp: 340 }],
    forum: { threadsStarted: 1, upvotedAnswers: 0, reputation: 12 },
  },
  {
    id: "jonah-lee",
    name: "Jonah Lee",
    email: "jonah.lee@quantumloop.edu",
    batch: "A",
    mastery: 68,
    status: "On Track",
    xp: 2140,
    streak: 9,
    predictAccuracy: 74,
    debugAttempts: 14,
    contestXp: 610,
    concepts: [
      { concept: "Superposition", mastery: 81 },
      { concept: "Entanglement", mastery: 70 },
      { concept: "Grover's Algorithm", mastery: 52, misconception: "Oracle marks the answer automatically" },
      { concept: "Noise & Error", mastery: 69 },
    ],
    predictLog: [
      { concept: "Grover's Algorithm — Diffusion", result: "wrong", timestamp: "5 hrs ago" },
      { concept: "Entanglement — CNOT", result: "correct", timestamp: "1 day ago" },
      { concept: "Superposition — Bloch sphere", result: "correct", timestamp: "2 days ago" },
    ],
    debugScenarios: [
      { title: "Resolve gate ordering bug", result: "solved", timestamp: "6 hrs ago" },
      { title: "Fix phase kickback error", result: "solved", timestamp: "2 days ago" },
    ],
    contests: [
      { name: "Quantum Debug Sprint", placement: "#12", xp: 410 },
      { name: "Winter Circuit Cup", placement: "#28", xp: 200 },
    ],
    forum: { threadsStarted: 3, upvotedAnswers: 5, reputation: 88 },
  },
  {
    id: "sofia-martinez",
    name: "Sofia Martinez",
    email: "sofia.martinez@quantumloop.edu",
    batch: "B",
    mastery: 91,
    status: "On Track",
    xp: 4310,
    streak: 21,
    predictAccuracy: 93,
    debugAttempts: 22,
    contestXp: 1450,
    concepts: [
      { concept: "Superposition", mastery: 97 },
      { concept: "Entanglement", mastery: 94 },
      { concept: "Grover's Algorithm", mastery: 88 },
      { concept: "Noise & Error", mastery: 85 },
    ],
    predictLog: [
      { concept: "Noise & Error — Depolarizing", result: "correct", timestamp: "3 hrs ago" },
      { concept: "Grover's Algorithm — Amplitude amp.", result: "correct", timestamp: "1 day ago" },
      { concept: "Entanglement — Teleportation", result: "correct", timestamp: "2 days ago" },
    ],
    debugScenarios: [
      { title: "Optimize noisy circuit depth", result: "solved", timestamp: "1 day ago" },
      { title: "Resolve gate ordering bug", result: "solved", timestamp: "3 days ago" },
    ],
    contests: [
      { name: "Winter Circuit Cup", placement: "#1", xp: 900 },
      { name: "Quantum Debug Sprint", placement: "#3", xp: 550 },
    ],
    forum: { threadsStarted: 7, upvotedAnswers: 19, reputation: 312 },
  },
  {
    id: "david-kim",
    name: "David Kim",
    email: "david.kim@quantumloop.edu",
    batch: "A",
    mastery: 37,
    status: "Inactive",
    xp: 890,
    streak: 0,
    predictAccuracy: 44,
    debugAttempts: 3,
    contestXp: 0,
    concepts: [
      { concept: "Superposition", mastery: 55 },
      { concept: "Entanglement", mastery: 28, misconception: "Entanglement means faster-than-light signaling" },
      { concept: "Grover's Algorithm", mastery: 21 },
      { concept: "Noise & Error", mastery: 44 },
    ],
    predictLog: [{ concept: "Superposition — H gate", result: "wrong", timestamp: "9 days ago" }],
    debugScenarios: [{ title: "Trace decoherence source", result: "failed", timestamp: "11 days ago" }],
    contests: [],
    forum: { threadsStarted: 0, upvotedAnswers: 0, reputation: 4 },
  },
  {
    id: "priya-nair",
    name: "Priya Nair",
    email: "priya.nair@quantumloop.edu",
    batch: "B",
    mastery: 82,
    status: "On Track",
    xp: 3250,
    streak: 15,
    predictAccuracy: 87,
    debugAttempts: 18,
    contestXp: 980,
    concepts: [
      { concept: "Superposition", mastery: 90 },
      { concept: "Entanglement", mastery: 84 },
      { concept: "Grover's Algorithm", mastery: 71 },
      { concept: "Noise & Error", mastery: 78 },
    ],
    predictLog: [
      { concept: "Entanglement — Bell state", result: "correct", timestamp: "8 min ago" },
      { concept: "Grover's Algorithm — Oracle", result: "correct", timestamp: "1 day ago" },
      { concept: "Noise & Error — Bit flip", result: "wrong", timestamp: "2 days ago" },
    ],
    debugScenarios: [
      { title: "Optimize noisy circuit depth", result: "solved", timestamp: "2 days ago" },
      { title: "Fix phase kickback error", result: "solved", timestamp: "5 days ago" },
    ],
    contests: [{ name: "Winter Circuit Cup", placement: "#9", xp: 620 }],
    forum: { threadsStarted: 4, upvotedAnswers: 11, reputation: 176 },
  },
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    email: "marcus.chen@quantumloop.edu",
    batch: "A",
    mastery: 55,
    status: "At-Risk",
    xp: 1720,
    streak: 4,
    predictAccuracy: 62,
    debugAttempts: 11,
    contestXp: 260,
    concepts: [
      { concept: "Superposition", mastery: 72 },
      { concept: "Entanglement", mastery: 51 },
      { concept: "Grover's Algorithm", mastery: 38, misconception: "Oracle marks the answer automatically" },
      { concept: "Noise & Error", mastery: 58 },
    ],
    predictLog: [
      { concept: "Grover's Algorithm — Oracle", result: "wrong", timestamp: "1 hr ago" },
      { concept: "Superposition — Bloch sphere", result: "correct", timestamp: "1 day ago" },
    ],
    debugScenarios: [{ title: "Resolve gate ordering bug", result: "in progress", timestamp: "2 days ago" }],
    contests: [{ name: "Quantum Debug Sprint", placement: "#33", xp: 260 }],
    forum: { threadsStarted: 1, upvotedAnswers: 2, reputation: 45 },
  },
  {
    id: "elena-rossi",
    name: "Elena Rossi",
    email: "elena.rossi@quantumloop.edu",
    batch: "B",
    mastery: 76,
    status: "On Track",
    xp: 2890,
    streak: 11,
    predictAccuracy: 80,
    debugAttempts: 16,
    contestXp: 720,
    concepts: [
      { concept: "Superposition", mastery: 85 },
      { concept: "Entanglement", mastery: 79 },
      { concept: "Grover's Algorithm", mastery: 64 },
      { concept: "Noise & Error", mastery: 74 },
    ],
    predictLog: [
      { concept: "Noise & Error — Depolarizing", result: "correct", timestamp: "20 min ago" },
      { concept: "Entanglement — Teleportation", result: "correct", timestamp: "1 day ago" },
    ],
    debugScenarios: [{ title: "Optimize noisy circuit depth", result: "solved", timestamp: "3 days ago" }],
    contests: [{ name: "Winter Circuit Cup", placement: "#15", xp: 480 }],
    forum: { threadsStarted: 2, upvotedAnswers: 6, reputation: 94 },
  },
  {
    id: "theo-brooks",
    name: "Theo Brooks",
    email: "theo.brooks@quantumloop.edu",
    batch: "A",
    mastery: 29,
    status: "At-Risk",
    xp: 640,
    streak: 1,
    predictAccuracy: 38,
    debugAttempts: 5,
    contestXp: 0,
    concepts: [
      { concept: "Superposition", mastery: 46, misconception: "Measurement collapses every qubit" },
      { concept: "Entanglement", mastery: 22 },
      { concept: "Grover's Algorithm", mastery: 18 },
      { concept: "Noise & Error", mastery: 31 },
    ],
    predictLog: [
      { concept: "Superposition — H gate", result: "wrong", timestamp: "4 hrs ago" },
      { concept: "Entanglement — Bell state", result: "wrong", timestamp: "2 days ago" },
    ],
    debugScenarios: [{ title: "Trace decoherence source", result: "failed", timestamp: "3 days ago" }],
    contests: [],
    forum: { threadsStarted: 0, upvotedAnswers: 1, reputation: 8 },
  },
]

export function studentInitials(name: string) {
  return initials(name)
}

export function masteryLevel(mastery: number): "High" | "Mid" | "Low" {
  if (mastery >= 75) return "High"
  if (mastery >= 50) return "Mid"
  return "Low"
}

export const assignmentOptions = [
  "Entanglement Quiz",
  "Superposition Lab",
  "Grover's Algorithm Challenge",
  "Noise & Error Debug Set",
  "Winter Circuit Cup",
]

export const reasonOptions = ["Grading dispute", "Hardware noise", "Medical", "Retest"]
