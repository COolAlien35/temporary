import { expect, test } from '@playwright/test'
import { createDemoPlatform } from '../lib/services/demo-platform'
import { createApiPlatform } from '../lib/services/api-platform'
import { createLearningLoopApi, LearningLoopApiError } from '../lib/services/learning-loop-api'
import { profileForToken } from '../lib/services/connected-auth'
import { circuitToQiskit } from '../lib/circuit-to-qiskit'
import { qiskitToCircuit } from '../lib/qiskit-to-circuit'
import { percentConfidenceToUnit, percentagesToPredictionVector } from '../lib/services/prediction-vector'

test('connected profile comes from the authenticated backend response', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const backend = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return Response.json({ id: 'server-user', name: 'Verified Learner', email: 'learner@example.edu', role: 'learner', preferences: { focus: 'algorithms', pace: 'self-paced', reduceMotion: true } })
  }) as typeof fetch
  const result = await profileForToken('current-token', backend, 'https://api.example.test/')
  expect(result).toEqual({ mode: 'connected', user: { id: 'server-user', name: 'Verified Learner', email: 'learner@example.edu', role: 'learner' }, preferences: { focus: 'algorithms', pace: 'self-paced', reduceMotion: true } })
  expect(calls[0].url).toBe('https://api.example.test/api/v1/me')
  expect(calls[0].init?.credentials).toBe('omit')
  expect(calls[0].init?.headers).toMatchObject({ Authorization: 'Bearer current-token' })

  const invalid = (async () => Response.json({ id: 'user', name: 'User', email: 'user@example.edu', role: 'admin' })) as typeof fetch
  await expect(profileForToken('token', invalid, 'https://api.example.test')).rejects.toThrow('Invalid account profile')
  const forbidden = (async () => Response.json({ error: { code: 'forbidden', message: 'Denied' } }, { status: 403 })) as typeof fetch
  await expect(profileForToken('token', forbidden, 'https://api.example.test')).rejects.toMatchObject({ status: 403, code: 'forbidden' })
})

test('connected settings read and patch the owned profile with a revision precondition', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const profile = { id: 'owner', email: 'owner@example.test', name: 'Owner', role: 'learner', revision: 4, timezone: 'UTC', preferences: { focus: 'foundations', pace: 'guided', reduceMotion: false } }
  const fetcher = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init })
    return Response.json(profile)
  }) as typeof fetch
  const api = createLearningLoopApi('https://api.example.test/api/v1', async () => 'current-token', fetcher)
  expect((await api.getProfile()).revision).toBe(4)
  await api.updateProfile({ name: 'New name', preferences: { pace: 'self-paced' } }, 4)
  expect(calls.map((call) => call.url)).toEqual(['https://api.example.test/api/v1/me', 'https://api.example.test/api/v1/me'])
  expect(calls[1].init.method).toBe('PATCH')
  expect(calls[1].init.headers).toMatchObject({ Authorization: 'Bearer current-token', 'If-Match': '"rev-4"' })
  expect(JSON.parse(String(calls[1].init.body))).toEqual({ name: 'New name', preferences: { pace: 'self-paced' } })
})

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

test('learning loop client uses current bearer tokens and backend routes', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  let token = 'first-token'
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ items: [], next_cursor: null }), { status: 200 })
  }) as typeof fetch
  const api = createLearningLoopApi('https://api.example.test/api/v1/', async () => token, fakeFetch)

  await api.listSessions({ lessonId: 'u1-quantum-foundations', limit: 1, cursor: 'session-id' })
  expect(calls[0].url).toBe('https://api.example.test/api/v1/learning-sessions?limit=1&cursor=session-id&lesson_id=u1-quantum-foundations')
  expect(calls[0].init?.credentials).toBe('omit')
  expect(calls[0].init?.headers).toMatchObject({ Authorization: 'Bearer first-token' })

  token = 'refreshed-token'
  await api.lockPrediction('session/id', {
    schema_version: 1, lesson_id: 'u1-quantum-foundations', lesson_version: 1,
    learning_session_id: 'session/id', prediction_vector: [0.5, 0.5],
    basis_labels: ['0', '1'], measurement_qubits: [0], comparison_basis: 'sampled_frequency',
  }, 'stable-key')
  expect(calls[1].url).toBe('https://api.example.test/api/v1/learning-sessions/session%2Fid/predictions')
  expect(calls[1].init?.method).toBe('POST')
  expect(calls[1].init?.headers).toMatchObject({ Authorization: 'Bearer refreshed-token', 'Idempotency-Key': 'stable-key' })
  expect(JSON.parse(String(calls[1].init?.body))).not.toHaveProperty('simulated_vector')

  await api.listPredictions('session/id', { limit: 20, cursor: 'prediction-id' })
  expect(calls[2].url).toBe('https://api.example.test/api/v1/learning-sessions/session%2Fid/predictions?limit=20&cursor=prediction-id')

  await api.updateCircuit('circuit/id', { name: 'Bell', qubits: 2, gates: [] }, 2)
  expect(calls[3].url).toBe('https://api.example.test/api/v1/circuits/circuit%2Fid')
  expect(calls[3].init?.headers).toMatchObject({ 'If-Match': '"rev-2"' })

  await api.submitRun({ circuit_id: 'circuit-id', circuit_revision: 2, backend: 'qiskit_aer', shots: 256, prediction_id: 'prediction-id' }, 'run-key')
  expect(calls[4].url).toBe('https://api.example.test/api/v1/experiments/runs')
  expect(calls[4].init?.headers).toMatchObject({ 'Idempotency-Key': 'run-key' })
  await api.getPair('prediction/id')
  expect(calls[5].url).toBe('https://api.example.test/api/v1/predictions/prediction%2Fid/pair')
  await api.sendTutorMessage('session/id', { action: 'unexpected', stage: 'observe', prompt: 'Why?', run_id: 'run-id' }, 'tutor-key')
  expect(calls[6].url).toBe('https://api.example.test/api/v1/learning-sessions/session%2Fid/tutor/messages')
  expect(calls[6].init?.headers).toMatchObject({ 'Idempotency-Key': 'tutor-key' })
  await api.getAgreementHistory('session/id')
  expect(calls[7].url).toBe('https://api.example.test/api/v1/learning-sessions/session%2Fid/agreement-history')
  expect(calls[7].init?.headers).toMatchObject({ Authorization: 'Bearer refreshed-token' })
})

test('learning loop client preserves safe service errors and requires managed auth', async () => {
  let calls = 0
  const fakeFetch = (async () => {
    calls++
    return new Response(JSON.stringify({ error: { code: 'prediction_already_paired', message: 'Prediction already has a run' } }), { status: 409 })
  }) as typeof fetch
  const missingToken = createLearningLoopApi('/api/v1', async () => null, fakeFetch)
  await expect(missingToken.listSessions()).rejects.toMatchObject({ status: 401, code: 'authentication_required' })
  expect(calls).toBe(0)

  const api = createLearningLoopApi('/api/v1', async () => 'managed-token', fakeFetch)
  await expect(api.getPair('prediction-id')).rejects.toMatchObject({ status: 409, code: 'prediction_already_paired' })
  expect(calls).toBe(1)
  expect(() => createLearningLoopApi('/wrong-base', async () => 'token', fakeFetch)).toThrow('/api/v1')
  expect(new LearningLoopApiError(409, 'conflict', 'Conflict')).toBeInstanceOf(Error)
})

test('Qiskit-style editor round-trips the controlled-Z gate used by Grover', () => {
  const gates = [{ id: 'h', step: 0, qubit: 0, gate: 'H' as const }, { id: 'cz', step: 1, qubit: 0, gate: 'CZ' as const, target: 1 }]
  const code = circuitToQiskit(gates, 2)
  const parsed = qiskitToCircuit(code, 2, 8)
  expect(parsed.unsupportedLines).toEqual([])
  expect(parsed.gates).toEqual([{ step: 0, qubit: 0, gate: 'H' }, { step: 1, qubit: 0, gate: 'CZ', target: 1 }])
})
