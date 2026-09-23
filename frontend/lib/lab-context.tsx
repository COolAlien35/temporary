"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import {
  type AlgorithmDef,
  type BasisState,
  type GatePlacement,
  type GateType,
  STAGES,
  XP_PER_STAGE,
  getAlgorithm,
} from "@/lib/lab-data"

export type ViewTab = "circuit" | "code" | "histogram" | "statevector" | "bloch"
export type LabMode = "guided" | "explore"

interface LabState {
  algorithm: AlgorithmDef
  stage: number
  completedStages: Set<number>
  hypothesis: Record<BasisState, number>
  confidence: number
  predictionLocked: boolean
  gates: GatePlacement[]
  shots: number
  noiseEnabled: boolean
  backend: string
  hasRun: boolean
  runAccuracy: number
  attempts: number
  hints: number
  xp: number
  mode: LabMode
  sessionLog: { id: string; text: string }[]
  activeTab: ViewTab
  debugDisabledGates: Set<string>
  debugAttempts: number
  debugSolved: boolean
  challengeSubmitted: boolean
  challengeScore: number | null
}

interface LabContextValue extends LabState {
  goToStage: (n: number) => void
  isStageUnlocked: (n: number) => boolean
  setHypothesis: (state: BasisState, value: number) => void
  setConfidence: (value: number) => void
  lockPrediction: () => void
  addGate: (gate: Omit<GatePlacement, "id">) => void
  removeGate: (id: string) => void
  setShots: (n: number) => void
  setNoiseEnabled: (v: boolean) => void
  setBackend: (name: string) => void
  runSimulation: () => void
  setMode: (m: LabMode) => void
  addLog: (text: string) => void
  addXp: (amount: number) => void
  incrementHints: () => void
  setActiveTab: (t: ViewTab) => void
  toggleDebugGate: (id: string) => void
  verifyDebugFix: () => boolean
  submitChallenge: () => void
  completeStage: (n: number) => void
  resetLab: () => void
}

const LabContext = createContext<LabContextValue | null>(null)

function emptyHypothesis(basisStates: BasisState[]): Record<BasisState, number> {
  const even = Math.floor(100 / basisStates.length)
  const result = {} as Record<BasisState, number>
  basisStates.forEach((s, i) => {
    result[s] = i === basisStates.length - 1 ? 100 - even * (basisStates.length - 1) : even
  })
  return result
}

export function LabProvider({
  algorithmSlug,
  initialStage,
  children,
}: {
  algorithmSlug: string
  initialStage: number
  children: React.ReactNode
}) {
  const algorithm = useMemo(() => getAlgorithm(algorithmSlug), [algorithmSlug])

  const [stage, setStage] = useState(initialStage)
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set())
  const [hypothesis, setHypothesisState] = useState<Record<BasisState, number>>(() =>
    emptyHypothesis(algorithm.basisStates),
  )
  const [confidence, setConfidenceState] = useState(50)
  const [predictionLocked, setPredictionLocked] = useState(false)
  const [gates, setGates] = useState<GatePlacement[]>([])
  const [shots, setShotsState] = useState(1024)
  const [noiseEnabled, setNoiseEnabledState] = useState(false)
  const [backend, setBackendState] = useState("Local State-Vector Simulator")
  const [hasRun, setHasRun] = useState(false)
  const [runAccuracy, setRunAccuracy] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [hints, setHints] = useState(0)
  const [xp, setXp] = useState(0)
  const [mode, setModeState] = useState<LabMode>("guided")
  const [sessionLog, setSessionLog] = useState<{ id: string; text: string }[]>([
    { id: "log-0", text: "Hypothesis pending" },
  ])
  const [activeTab, setActiveTab] = useState<ViewTab>("circuit")
  const [debugDisabledGates, setDebugDisabledGates] = useState<Set<string>>(new Set())
  const [debugAttempts, setDebugAttempts] = useState(0)
  const [debugSolved, setDebugSolved] = useState(false)
  const [challengeSubmitted, setChallengeSubmitted] = useState(false)
  const [challengeScore, setChallengeScore] = useState<number | null>(null)

  const addLog = useCallback((text: string) => {
    setSessionLog((prev) => [...prev, { id: `log-${prev.length}-${Date.now()}`, text }])
  }, [])

  const addXp = useCallback((amount: number) => {
    setXp((prev) => prev + amount)
  }, [])

  const isStageUnlocked = useCallback(
    (n: number) => {
      if (n === 1) return true
      return completedStages.has(n - 1) || n === stage
    },
    [completedStages, stage],
  )

  const completeStage = useCallback(
    (n: number) => {
      setCompletedStages((prev) => {
        if (prev.has(n)) return prev
        const next = new Set(prev)
        next.add(n)
        return next
      })
      setXp((prev) => prev + (XP_PER_STAGE[n] ?? 0))
    },
    [],
  )

  const goToStage = useCallback(
    (n: number) => {
      if (n < 1 || n > STAGES.length) return
      if (!isStageUnlocked(n)) return
      setStage(n)
      const tabForStage: Partial<Record<number, ViewTab>> = {
        3: "circuit",
        4: "circuit",
        5: "histogram",
        9: "statevector",
      }
      if (tabForStage[n]) setActiveTab(tabForStage[n] as ViewTab)
    },
    [isStageUnlocked],
  )

  const setHypothesis = useCallback(
    (state: BasisState, value: number) => {
      setHypothesisState((prev) => ({ ...prev, [state]: value }))
    },
    [],
  )

  const setConfidence = useCallback((value: number) => setConfidenceState(value), [])

  const lockPrediction = useCallback(() => {
    setPredictionLocked(true)
    completeStage(2)
    addLog("Hypothesis committed \u00b7 Run unlocked")
    goToStage(3)
  }, [addLog, completeStage, goToStage])

  const addGate = useCallback((gate: Omit<GatePlacement, "id">) => {
    setGates((prev) => [...prev, { ...gate, id: `gate-${prev.length}-${Date.now()}` }])
  }, [])

  const removeGate = useCallback((id: string) => {
    setGates((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const setShots = useCallback((n: number) => setShotsState(n), [])
  const setNoiseEnabled = useCallback((v: boolean) => setNoiseEnabledState(v), [])
  const setBackend = useCallback((name: string) => setBackendState(name), [])

  const runSimulation = useCallback(() => {
    setAttempts((prev) => prev + 1)
    setHasRun(true)
    const target = algorithm.correctDistribution
    let error = 0
    algorithm.basisStates.forEach((s) => {
      error += Math.abs((hypothesis[s] ?? 0) - (target[s] ?? 0))
    })
    const noisePenalty = noiseEnabled ? 6 : 0
    const accuracy = Math.max(0, Math.round(100 - error / 2 - noisePenalty))
    setRunAccuracy(accuracy)
    addLog("Simulation completed")
    completeStage(4)
    setActiveTab("histogram")
    goToStage(5)
  }, [addLog, algorithm, completeStage, goToStage, hypothesis, noiseEnabled])

  const setMode = useCallback((m: LabMode) => setModeState(m), [])

  const incrementHints = useCallback(() => setHints((prev) => prev + 1), [])

  const toggleDebugGate = useCallback((id: string) => {
    setDebugDisabledGates((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const verifyDebugFix = useCallback(() => {
    setDebugAttempts((prev) => prev + 1)
    const solved = debugDisabledGates.has(algorithm.seededFault.gateId)
    if (solved) {
      setDebugSolved(true)
      addLog("Fault isolated \u00b7 distribution restored")
      completeStage(7)
    }
    return solved
  }, [addLog, algorithm.seededFault.gateId, completeStage, debugDisabledGates])

  const submitChallenge = useCallback(() => {
    const usedGates = gates.length
    const budget = algorithm.challenge.gateBudget
    const efficiency = Math.max(0, 100 - Math.max(0, usedGates - 5) * 15)
    const score = usedGates <= budget ? efficiency : Math.max(0, efficiency - 20)
    setChallengeScore(score)
    setChallengeSubmitted(true)
    addLog(`Optimization scored ${score}%`)
    completeStage(8)
  }, [addLog, algorithm.challenge.gateBudget, completeStage, gates.length])

  const resetLab = useCallback(() => {
    setStage(1)
    setCompletedStages(new Set())
    setHypothesisState(emptyHypothesis(algorithm.basisStates))
    setConfidenceState(50)
    setPredictionLocked(false)
    setGates([])
    setHasRun(false)
    setRunAccuracy(0)
    setAttempts(0)
    setHints(0)
    setXp(0)
    setSessionLog([{ id: "log-0", text: "Hypothesis pending" }])
    setActiveTab("circuit")
    setDebugDisabledGates(new Set())
    setDebugAttempts(0)
    setDebugSolved(false)
    setChallengeSubmitted(false)
    setChallengeScore(null)
  }, [algorithm.basisStates])

  const value: LabContextValue = {
    algorithm,
    stage,
    completedStages,
    hypothesis,
    confidence,
    predictionLocked,
    gates,
    shots,
    noiseEnabled,
    backend,
    hasRun,
    runAccuracy,
    attempts,
    hints,
    xp,
    mode,
    sessionLog,
    activeTab,
    debugDisabledGates,
    debugAttempts,
    debugSolved,
    challengeSubmitted,
    challengeScore,
    goToStage,
    isStageUnlocked,
    setHypothesis,
    setConfidence,
    lockPrediction,
    addGate,
    removeGate,
    setShots,
    setNoiseEnabled,
    setBackend,
    runSimulation,
    setMode,
    addLog,
    addXp,
    incrementHints,
    setActiveTab,
    toggleDebugGate,
    verifyDebugFix,
    submitChallenge,
    completeStage,
    resetLab,
  }

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>
}

export function useLab() {
  const ctx = useContext(LabContext)
  if (!ctx) throw new Error("useLab must be used within a LabProvider")
  return ctx
}

export type { GateType }
