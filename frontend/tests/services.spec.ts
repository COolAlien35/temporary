import { expect, test } from '@playwright/test'
import { createDemoPlatform } from '../lib/services/demo-platform'
import { createApiPlatform } from '../lib/services/api-platform'
import { circuitToQiskit } from '../lib/circuit-to-qiskit'
import { qiskitToCircuit } from '../lib/qiskit-to-circuit'
import { percentConfidenceToUnit, percentagesToPredictionVector } from '../lib/services/prediction-vector'

test('prediction percentages convert to ordered wire probabilities', () => {
  expect(percentagesToPredictionVector({ '0': 25, '1': 75 }, ['1', '0'])).toEqual([0.75, 0.25])
  expect(percentConfidenceToUnit(80)).toBe(0.8)
  expect(() => percentagesToPredictionVector({ '0': 50, '1': 40 }, ['0', '1'])).toThrow('sum to 100')
  expect(() => percentagesToPredictionVector({ '0': 50, '1': 50, extra: 0 }, ['0', '1'])).toThrow('exactly')
  expect(() => percentagesToPredictionVector({ '0': Number.NaN, '1': 100 }, ['0', '1'])).toThrow('finite')
  expect(() => percentagesToPredictionVector({ '0': 50, '1': 50 }, ['0', '0'])).toThrow('distinct')
  expect(() => percentConfidenceToUnit(Number.POSITIVE_INFINITY)).toThrow('finite')
})

test('demo service has distinct success, empty and failure states', async () => {
  const success = createDemoPlatform({ delayMs: 0 })
  const empty = createDemoPlatform({ delayMs: 0, scenarios: { curriculum: 'empty' } })
  const failure = createDemoPlatform({ delayMs: 0, scenarios: { curriculum: 'failure' } })

  const units = await success.curriculum.listUnits()
  expect(units.length).toBe(9)
  expect(units[0].lessons[0].type).toBe('Concept')
  expect(units[8].lessons[0].type).toBe('Lab')
  expect(units[0].lessons[0].checkpoints[0]).toEqual(expect.objectContaining({ id: expect.any(String), prompt: expect.any(String), options: expect.any(Array) }))
  expect(JSON.stringify(units)).not.toContain('"answer"')
  expect(JSON.stringify(units)).not.toContain('"explanation"')
  expect(await empty.curriculum.listUnits()).toEqual([])
  await expect(failure.curriculum.listUnits()).rejects.toThrow('temporarily unavailable')
})

test('local experiment uses the submitted circuit and refuses external execution', async () => {
  const services = createDemoPlatform({ delayMs: 0 })
  const request = {
    algorithmSlug: 'superposition',
    circuit: { name: 'Hadamard', qubits: 1, gates: [{ id: 'h-0', type: 'H' as const, step: 0, qubit: 0 }] },
    backend: 'local' as const,
    shots: 100,
  }
  const run = await services.experiments.run(request)
  expect(run.status).toBe('completed')
  expect(run.result?.counts).toEqual({ '0': 50, '1': 50 })
  expect((await services.experiments.run(request)).id).toBe(run.id)
  await expect(services.experiments.run({ ...request, backend: 'qiskit-aer' })).rejects.toThrow('unavailable')
})

test('code grading adapter distinguishes unavailable, pending and service failure', async () => {
  const request = { challengeId: 'code-bell-pair', learnerId: 'demo-learner', code: 'h(0)' }
  expect(await createDemoPlatform({ delayMs: 0 }).assessments.gradeCodeChallenge(request)).toMatchObject({ status: 'failed', score: null })
  expect(await createDemoPlatform({ delayMs: 0, scenarios: { assessments: 'empty' } }).assessments.gradeCodeChallenge(request)).toMatchObject({ status: 'pending', score: null })
  await expect(createDemoPlatform({ delayMs: 0, scenarios: { assessments: 'failure' } }).assessments.gradeCodeChallenge(request)).rejects.toThrow('temporarily unavailable')
})

test('community demo adapter exposes sample, empty and failure states', async () => {
  const success = createDemoPlatform({ delayMs: 0 })
  const empty = createDemoPlatform({ delayMs: 0, scenarios: { community: 'empty' } })
  const failure = createDemoPlatform({ delayMs: 0, scenarios: { community: 'failure' } })
  expect((await success.community.listThreads('entanglement-speed')).map((item) => item.id)).toContain('t1')
  expect(await empty.community.listThreads()).toEqual([])
  await expect(failure.community.listThreads()).rejects.toThrow('temporarily unavailable')
})

test('API adapter sends typed requests only to the configured origin', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
  const services = createApiPlatform('https://api.example.test/', fakeFetch)

  await services.assessments.listAttempts('learner/one')
  expect(calls[0].url).toBe('https://api.example.test/learners/learner%2Fone/attempts')
  expect(calls[0].init?.credentials).toBe('include')
  await services.auth.inspectResetLink('token/one')
  expect(calls[1].url).toBe('https://api.example.test/auth/password-reset?token=token%2Fone')
  await services.assessments.listTemplates()
  expect(calls[2].url).toBe('https://api.example.test/instructor/assessment-templates')
  await services.assessments.saveTemplate({ kind: 'quiz', title: 'Example', unitId: 'u1', instructions: 'Study this circuit', circuit: { name: 'Example', qubits: 1, gates: [] }, circuitSource: 'template:bell', questions: [], reflectionPrompt: 'Explain' }, 'template/one')
  expect(calls[3].url).toBe('https://api.example.test/instructor/assessment-templates/template%2Fone')
  expect(calls[3].init?.method).toBe('PUT')
  await services.community.listThreads('contest/one')
  expect(calls[4].url).toBe('https://api.example.test/community/threads?contestId=contest%2Fone')
})

test('Qiskit-style editor round-trips the controlled-Z gate used by Grover', () => {
  const gates = [{ id: 'h', step: 0, qubit: 0, gate: 'H' as const }, { id: 'cz', step: 1, qubit: 0, gate: 'CZ' as const, target: 1 }]
  const code = circuitToQiskit(gates, 2)
  const parsed = qiskitToCircuit(code, 2, 8)
  expect(parsed.unsupportedLines).toEqual([])
  expect(parsed.gates).toEqual([{ step: 0, qubit: 0, gate: 'H' }, { step: 1, qubit: 0, gate: 'CZ', target: 1 }])
})
