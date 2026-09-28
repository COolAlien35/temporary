import type { PlatformServices } from "./contracts"

/** API contract for a future backend. Construct only after a real base URL is configured. */
export function createApiPlatform(baseUrl: string, fetcher: typeof fetch = fetch): PlatformServices {
  if (!baseUrl) throw new Error("An API base URL is required.")
  const root = baseUrl.replace(/\/$/, "")

  async function request<T>(path: string, init?: RequestInit, allowMissing = false): Promise<T> {
    const response = await fetcher(`${root}${path}`, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    })
    if (allowMissing && response.status === 404) return null as T
    if (!response.ok) throw new Error(`Service request failed (${response.status}). Please retry.`)
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  const body = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) })

  return {
    auth: {
      signIn: (email, password) => request("/auth/login", body({ email, password })),
      signUp: (name, email, password) => request("/auth/signup", body({ name, email, password })),
      requestPasswordReset: (email) => request("/auth/password-reset", body({ email })),
      inspectResetLink: (token) => request(`/auth/password-reset?token=${encodeURIComponent(token)}`),
      confirmPasswordReset: async (token, password) => { await request("/auth/password-reset/confirm", body({ token, password })) },
    },
    curriculum: {
      listUnits: () => request("/curriculum/units"),
      getUnit: (id) => request(`/curriculum/units/${encodeURIComponent(id)}`, undefined, true),
    },
    experiments: { run: (input) => request("/experiments/runs", body(input)) },
    tutor: { respond: (input) => request("/tutor/messages", body(input)) },
    assessments: {
      listAttempts: (learnerId) => request(`/learners/${encodeURIComponent(learnerId)}/attempts`),
      gradeCodeChallenge: (input) => request("/assessments/code-grades", body(input)),
      listTemplates: () => request("/instructor/assessment-templates"),
      saveTemplate: (input, id) => request(id ? `/instructor/assessment-templates/${encodeURIComponent(id)}` : "/instructor/assessment-templates", { method: id ? "PUT" : "POST", body: JSON.stringify(input) }),
    },
    progress: { getSummary: (learner) => request(`/learners/${encodeURIComponent(learner.id)}/summary`) },
    instructor: { getSummary: (cohortId) => request(`/instructor/cohorts/${encodeURIComponent(cohortId)}/summary`, undefined, true) },
    community: {
      listThreads: (contestId) => request(`/community/threads${contestId ? `?contestId=${encodeURIComponent(contestId)}` : ""}`),
      getThread: (id) => request(`/community/threads/${encodeURIComponent(id)}`, undefined, true),
      createThread: (input) => request("/community/threads", body(input)),
      addReply: (input) => request(`/community/threads/${encodeURIComponent(input.threadId)}/replies`, body(input)),
      toggleVote: async (threadId, voterId) => { await request(`/community/threads/${encodeURIComponent(threadId)}/votes`, body({ voterId })) },
      enterContest: async (contestId, learnerId) => { await request(`/contests/${encodeURIComponent(contestId)}/entries`, body({ learnerId })) },
      listEntries: (learnerId) => request(`/learners/${encodeURIComponent(learnerId)}/contest-entries`),
      listReplies: (threadId) => request(`/community/threads/${encodeURIComponent(threadId)}/replies`),
    },
  }
}
