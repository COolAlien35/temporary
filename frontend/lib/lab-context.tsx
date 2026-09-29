"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  type AlgorithmDef,
  type BasisState,
  type GatePlacement,
  type GateType,
  STAGES,
  XP_PER_STAGE,
  getAlgorithm,
} from "@/lib/lab-data"
import { getAlgorithmConfig } from "@/lib/algorithms"
import { runCircuit } from "@/lib/sim/run-circuit"
import type { SimResult, StudioGate } from "@/lib/studio/types"
import type { ConnectedLabResult } from "@/lib/services/connected-lab-run"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useSession } from "@/store/use-session"

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
  simulationResult: SimResult | null
  previousSimulationResult: SimResult | null
  lastRunGates: GatePlacement[]
  resultsStale: boolean
  simulationError: string
  connectedResult: ConnectedLabResult | null
  connectedRunMode: boolean
  rememberConnectedResult: (result: ConnectedLabResult) => void
  showConnectedResult: (result: ConnectedLabResult) => void
  openConnectedRun: (runId: string) => void
}

interface LabContextValue extends LabState {
  goToStage: (n: number) => void
  isStageUnlocked: (n: number) => boolean
  setHypothesis: (state: BasisState, value: number) => void
  setConfidence: (value: number) => void
  lockPrediction: () => void
  addGate: (gate: Omit<GatePlacement, "id">) => void
  removeGate: (id: string) => void
  replaceGates: (gates: (Omit<GatePlacement, "id"> & { id?: string })[]) => void
  setShots: (n: number) => void
  setNoiseEnabled: (v: boolean) => void
  setBackend: (name: string) => void
  runSimulation: (gatesToRun?: GatePlacement[]) => SimResult | null
  setMode: (m: LabMode) => void
  addLog: (text: string) => void
  addXp: (amount: number) => void
  incrementHints: () => void
  setActiveTab: (t: ViewTab) => void
  toggleDebugGate: (id: string) => void
  verifyDebugFix: () => boolean
  submitChallenge: () => void
  completeStage: (n: number) => void
  advanceStage: (completed: number, next: number) => void
  resetLab: () => void
}

const LabContext = createContext<LabContextValue | null>(null)

interface PersistedLabSession {
  version: 1; stage: number; completedStages: number[]; hypothesis: Record<string, number>; confidence: number; predictionLocked: boolean;
  gates: GatePlacement[]; shots: number; noiseEnabled: boolean; hasRun: boolean; runAccuracy: number; attempts: number; hints: number; xp: number;
  mode: LabMode; sessionLog: { id: string; text: string }[]; activeTab: ViewTab; debugDisabledGates: string[]; debugAttempts: number; debugSolved: boolean;
  challengeSubmitted: boolean; challengeScore: number | null; simulationResult: SimResult | null; previousSimulationResult?: SimResult | null; lastRunGates: GatePlacement[];
}

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
  const algorithm = useMemo(() => {
    const legacy = getAlgorithm(algorithmSlug)
    const config = getAlgorithmConfig(algorithmSlug)
    if (!config || !legacy) throw new Error(`Incomplete lab configuration for ${algorithmSlug}`)
    return { ...legacy, slug: config.meta.slug, name: config.meta.title, qubits: config.register.qubits, timesteps: config.register.timesteps, backendName: "Local State-Vector Simulator" }
  }, [algorithmSlug])

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
  const [simulationResult, setSimulationResult] = useState<SimResult | null>(null)
  const [previousSimulationResult, setPreviousSimulationResult] = useState<SimResult | null>(null)
  const [lastRunGates, setLastRunGates] = useState<GatePlacement[]>([])
  const [simulationError, setSimulationError] = useState("")
  const [connectedResult, setConnectedResult] = useState<ConnectedLabResult | null>(null)
  const [connectedResultOwnerId, setConnectedResultOwnerId] = useState<string | null>(null)
  const [hydratedSessionKey, setHydratedSessionKey] = useState<string | null>(null)
  const learnerId = useSession((state) => state.user?.id ?? null)
  const connectedRunMode = useSession((state) => state.mode === "connected") && algorithm.slug === "superposition"
  const sessionKey = `quantumloop-demo-lab:${learnerId ?? "guest"}:${algorithmSlug}`
  const updateLearnerStage = useLearnerProgress((state) => state.updateStage)
  const addLearnerXp = useLearnerProgress((state) => state.addXP)
  const recordExperiment = useLearnerProgress((state) => state.recordExperiment)
  const recordAssessmentAttempt = useLearnerProgress((state) => state.recordAssessmentAttempt)
  const recordHint = useLearnerProgress((state) => state.recordHint)
  const recordCalibration = useLearnerProgress((state) => state.addCalibration)
  const resultsStale = hasRun && JSON.stringify(gates) !== JSON.stringify(lastRunGates)

  useEffect(() => { setConnectedResult(null); setConnectedResultOwnerId(null) }, [learnerId, algorithm.slug])

  const rememberConnectedResult = useCallback((result: ConnectedLabResult) => {
    setConnectedResult(result)
    setConnectedResultOwnerId(learnerId)
  }, [learnerId])
  const showConnectedResult = useCallback((result: ConnectedLabResult) => {
    rememberConnectedResult(result)
    setStage(5)
    setActiveTab("circuit")
    const url = new URL(window.location.href)
    url.searchParams.set("stage", "5")
    url.searchParams.set("run", result.run.id)
    window.history.replaceState(window.history.state, "", url)
  }, [rememberConnectedResult])
  const openConnectedRun = useCallback((runId: string) => {
    setConnectedResult(null)
    setConnectedResultOwnerId(null)
    setStage(5)
    setActiveTab("circuit")
    const url = new URL(window.location.href)
    url.searchParams.set("stage", "5")
    url.searchParams.set("run", runId)
    window.history.replaceState(window.history.state, "", url)
  }, [])
  const currentConnectedResult = connectedResultOwnerId === learnerId ? connectedResult : null

  useEffect(() => {
    setHydratedSessionKey(null)
    try {
      const raw = localStorage.getItem(sessionKey)
      if (raw) {
        const saved = JSON.parse(raw) as PersistedLabSession
        if (saved.version === 1) {
          if (initialStage === 1 && saved.stage >= 1 && saved.stage <= STAGES.length) setStage(saved.stage)
          setCompletedStages(new Set(saved.completedStages ?? []))
          setHypothesisState({ ...emptyHypothesis(algorithm.basisStates), ...saved.hypothesis })
          setConfidenceState(saved.confidence ?? 50)
          setPredictionLocked(Boolean(saved.predictionLocked))
          setGates(saved.gates ?? [])
          setShotsState(saved.shots ?? 1024)
          setNoiseEnabledState(Boolean(saved.noiseEnabled))
          setHasRun(Boolean(saved.hasRun))
          setRunAccuracy(saved.runAccuracy ?? 0)
          setAttempts(saved.attempts ?? 0)
          setHints(saved.hints ?? 0)
          setXp(saved.xp ?? 0)
          setModeState(saved.mode ?? "guided")
          setSessionLog(saved.sessionLog ?? [{ id: "log-0", text: "Hypothesis pending" }])
          setActiveTab(saved.activeTab ?? "circuit")
          setDebugDisabledGates(new Set(saved.debugDisabledGates ?? []))
          setDebugAttempts(saved.debugAttempts ?? 0)
          setDebugSolved(Boolean(saved.debugSolved))
          setChallengeSubmitted(Boolean(saved.challengeSubmitted))
          setChallengeScore(saved.challengeScore ?? null)
          setSimulationResult(saved.simulationResult ?? null)
          setPreviousSimulationResult(saved.previousSimulationResult ?? null)
          setLastRunGates(saved.lastRunGates ?? [])
        }
      }
    } catch {
      try { localStorage.removeItem(sessionKey) } catch { /* Storage can be unavailable in private browsing. */ }
    }
    setHydratedSessionKey(sessionKey)
  }, [algorithm.basisStates, initialStage, sessionKey])

  useEffect(() => {
    if (hydratedSessionKey !== sessionKey) return
    const snapshot: PersistedLabSession = { version: 1, stage, completedStages: [...completedStages], hypothesis, confidence, predictionLocked, gates, shots, noiseEnabled, hasRun, runAccuracy, attempts, hints, xp, mode, sessionLog, activeTab, debugDisabledGates: [...debugDisabledGates], debugAttempts, debugSolved, challengeSubmitted, challengeScore, simulationResult, previousSimulationResult, lastRunGates }
    try { localStorage.setItem(sessionKey, JSON.stringify(snapshot)) } catch { /* Storage can be unavailable in private browsing. */ }
  }, [activeTab, attempts, challengeScore, challengeSubmitted, completedStages, confidence, debugAttempts, debugDisabledGates, debugSolved, gates, hasRun, hints, hydratedSessionKey, hypothesis, lastRunGates, mode, noiseEnabled, predictionLocked, previousSimulationResult, runAccuracy, sessionKey, sessionLog, shots, simulationResult, stage, xp])

  const addLog = useCallback((text: string) => {
    setSessionLog((prev) => [...prev, { id: `log-${prev.length}-${Date.now()}`, text }])
  }, [])

  const addXp = useCallback((amount: number) => {
    setXp((prev) => prev + amount)
  }, [])

  const isStageUnlocked = useCallback(
    (n: number) => {
      if (connectedRunMode && n > 6) return false
      if (n === 1) return true
      if (connectedRunMode && n === 5) return true
      // Any stage already reached (current or earlier) is always revisitable.
      if (n <= stage) return true
      return completedStages.has(n - 1)
    },
    [completedStages, connectedRunMode, stage],
  )

  const completeStage = useCallback((n: number) => {
    if (completedStages.has(n)) return
    setCompletedStages((prev) => {
      const next = new Set(prev)
      next.add(n)
      return next
    })
    if (!connectedRunMode) {
      const earned = XP_PER_STAGE[n] ?? 0
      setXp((prev) => prev + earned)
      addLearnerXp(earned)
      updateLearnerStage(algorithm.slug, n)
    }
  }, [addLearnerXp, algorithm.slug, completedStages, connectedRunMode, updateLearnerStage])

  const tabForStage: Partial<Record<number, ViewTab>> = {
    3: "circuit",
    4: "circuit",
    5: "circuit",
    9: "circuit",
  }

  const goToStage = useCallback(
    (n: number) => {
      if (n < 1 || n > STAGES.length) return
      if (!isStageUnlocked(n)) return
      setStage(n)
      if (connectedRunMode) {
        const url = new URL(window.location.href)
        url.searchParams.set("stage", String(n))
        if (n !== 5 && n !== 6) url.searchParams.delete("run")
        window.history.replaceState(window.history.state, "", url)
      }
      if (tabForStage[n]) setActiveTab(tabForStage[n] as ViewTab)
    },
    [connectedRunMode, isStageUnlocked],
  )

  // Completing a stage and immediately advancing to the next one happens in the same
  // synchronous event handler. `completeStage`'s `setCompletedStages` update hasn't
  // flushed yet at that point, so a `goToStage` call right after it would read a stale
  // `completedStages` set and incorrectly refuse to unlock the next stage. `advanceStage`
  // performs both state transitions atomically, bypassing the unlock check entirely since
  // the caller is the app's own guided flow (not a user-initiated jump).
  const advanceStage = useCallback((completed: number, next: number) => {
    if (!completedStages.has(completed)) {
      if (!connectedRunMode) {
        const earned = XP_PER_STAGE[completed] ?? 0
        setXp((prev) => prev + earned)
        addLearnerXp(earned)
        updateLearnerStage(algorithm.slug, completed)
      }
    }
    setCompletedStages((prev) => {
      if (prev.has(completed)) return prev
      const nextSet = new Set(prev)
      nextSet.add(completed)
      return nextSet
    })
    if (next < 1 || next > STAGES.length || (connectedRunMode && next > 6)) return
    setStage(next)
    if (connectedRunMode) {
      const url = new URL(window.location.href)
      url.searchParams.set("stage", String(next))
      if (next !== 5 && next !== 6) url.searchParams.delete("run")
      window.history.replaceState(window.history.state, "", url)
    }
    if (tabForStage[next]) setActiveTab(tabForStage[next] as ViewTab)
  }, [addLearnerXp, algorithm.slug, completedStages, connectedRunMode, updateLearnerStage])

  const setHypothesis = useCallback(
    (state: BasisState, value: number) => {
      setHypothesisState((prev) => ({ ...prev, [state]: value }))
    },
    [],
  )

  const setConfidence = useCallback((value: number) => setConfidenceState(value), [])

  const lockPrediction = useCallback(() => {
    setPredictionLocked(true)
    addLog("Hypothesis committed \u00b7 Run unlocked")
    advanceStage(2, 3)
  }, [addLog, advanceStage])

  const addGate = useCallback((gate: Omit<GatePlacement, "id">) => {
    setGates((prev) => [...prev, { ...gate, id: `gate-${prev.length}-${Date.now()}` }])
    setChallengeSubmitted(false)
    setChallengeScore(null)
  }, [])

  const removeGate = useCallback((id: string) => {
    setGates((prev) => prev.filter((g) => g.id !== id))
    setChallengeSubmitted(false)
    setChallengeScore(null)
  }, [])

  const replaceGates = useCallback((next: (Omit<GatePlacement, "id"> & { id?: string })[]) => {
    setGates(next.map((g, i) => ({ ...g, id: g.id ?? `gate-${i}-${Date.now()}` })))
    setChallengeSubmitted(false)
    setChallengeScore(null)
  }, [])

  const setShots = useCallback((n: number) => setShotsState(n), [])
  const setNoiseEnabled = useCallback((v: boolean) => setNoiseEnabledState(v), [])
  const setBackend = useCallback((name: string) => setBackendState(name), [])

  const runSimulation = useCallback((gatesToRun: GatePlacement[] = gates) => {
    const simGates: StudioGate[] = gatesToRun.map((gate) => ({ id: gate.id, type: gate.gate, step: gate.step, qubit: gate.qubit, target: gate.target }))
    try {
      const result = runCircuit(algorithm.qubits, simGates, { shots, depolarizing: noiseEnabled ? 0.02 : 0 })
      setPreviousSimulationResult(simulationResult)
      setSimulationResult(result)
      setLastRunGates(gatesToRun.map((gate) => ({ ...gate })))
      const observed = Object.fromEntries(algorithm.basisStates.map((state) => [state, ((result.counts[state] ?? 0) / result.shots) * 100]))
      const error = algorithm.basisStates.reduce((total, state) => total + Math.abs((hypothesis[state] ?? 0) - (observed[state] ?? 0)), 0)
      const accuracy = Math.max(0, Math.round(100 - error / 2))
      setRunAccuracy(accuracy)
      recordCalibration(algorithm.slug, accuracy)
      setSimulationError("")
      setAttempts((prev) => prev + 1)
      setHasRun(true)
      recordExperiment(`${algorithm.name} lab run`, `/lab/${algorithm.slug}`, `${algorithm.qubits} qubits · ${gatesToRun.length} gates · ${shots.toLocaleString()} shots`)
      addLog(`Local simulation completed · ${shots.toLocaleString()} shots`)
      advanceStage(4, 5)
      return result
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : "The local simulator could not run this circuit.")
      return null
    }
  }, [addLog, algorithm, advanceStage, gates, hypothesis, noiseEnabled, recordCalibration, recordExperiment, shots, simulationResult])

  const setMode = useCallback((m: LabMode) => setModeState(m), [])

  const incrementHints = useCallback(() => { setHints((prev) => prev + 1); recordHint(algorithm.slug) }, [algorithm.slug, recordHint])

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
    const debugCircuit = algorithm.debugCircuit ?? algorithm.correctGates
    const remaining = debugCircuit.filter((gate) => !debugDisabledGates.has(gate.id))
    const debugResult = runCircuit(algorithm.qubits, remaining.map((gate) => ({ id: gate.id, type: gate.gate, step: gate.step, qubit: gate.qubit, target: gate.target })), { shots: 512 })
    const solved = debugDisabledGates.has(algorithm.seededFault.gateId) && algorithm.basisStates.every((state) => Math.abs((debugResult.probabilities[state] ?? 0) * 100 - (algorithm.correctDistribution[state] ?? 0)) <= algorithm.challenge.tolerance)
    if (solved) {
      setDebugSolved(true)
      addLog("Fault isolated \u00b7 distribution restored")
      completeStage(7)
    }
    return solved
  }, [addLog, algorithm, completeStage, debugDisabledGates])

  const submitChallenge = useCallback(() => {
    const simGates: StudioGate[] = gates.map((gate) => ({ id: gate.id, type: gate.gate, step: gate.step, qubit: gate.qubit, target: gate.target }))
    const result = runCircuit(algorithm.qubits, simGates, { shots })
    setSimulationResult(result)
    setLastRunGates(gates.map((gate) => ({ ...gate })))
    const maxError = Math.max(...algorithm.basisStates.map((state) => Math.abs((result.probabilities[state] ?? 0) * 100 - (algorithm.challenge.targetDistribution[state] ?? 0))))
    const usedGates = gates.length
    const budget = algorithm.challenge.gateBudget
    const valid = usedGates > 0 && usedGates <= budget && maxError <= algorithm.challenge.tolerance
    const score = valid ? Math.max(70, Math.round(100 - usedGates / budget * 15)) : Math.min(69, Math.max(0, Math.round(100 - maxError)))
    setChallengeScore(score)
    setChallengeSubmitted(true)
    recordAssessmentAttempt({
      id: crypto.randomUUID(), assessmentId: algorithm.slug, learnerId: learnerId ?? "demo-learner", kind: "lab-challenge",
      score, status: "graded", passed: valid, submittedAt: Date.now(),
      feedback: [valid ? "Target outcome and gate budget met" : "Review the target distribution and gate budget", `Maximum outcome error: ${maxError.toFixed(1)}%`, `${usedGates} of ${budget} gates used`],
      snapshot: { circuit: { name: `${algorithm.name} lab challenge`, qubits: algorithm.qubits, gates: simGates }, probabilities: result.probabilities },
    })
    addLog(`Circuit evaluated · maximum outcome error ${maxError.toFixed(1)}% · score ${score}%`)
    if (score >= 70) completeStage(8)
  }, [addLog, algorithm, completeStage, gates, learnerId, recordAssessmentAttempt, shots])

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
    setSimulationResult(null)
    setPreviousSimulationResult(null)
    setLastRunGates([])
    setSimulationError("")
    setConnectedResult(null)
    setConnectedResultOwnerId(null)
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
    hasRun: connectedRunMode ? currentConnectedResult !== null : hasRun,
    runAccuracy: connectedRunMode && currentConnectedResult ? Math.round(currentConnectedResult.pair.prediction_match * 100) : runAccuracy,
    attempts,
    hints,
    xp: connectedRunMode ? 0 : xp,
    mode,
    sessionLog,
    activeTab,
    debugDisabledGates,
    debugAttempts,
    debugSolved,
    challengeSubmitted,
    challengeScore,
    simulationResult,
    previousSimulationResult,
    lastRunGates,
    resultsStale,
    simulationError,
    connectedResult: currentConnectedResult,
    connectedRunMode,
    rememberConnectedResult,
    showConnectedResult,
    openConnectedRun,
    goToStage,
    isStageUnlocked,
    setHypothesis,
    setConfidence,
    lockPrediction,
    addGate,
    removeGate,
    replaceGates,
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
    advanceStage,
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
