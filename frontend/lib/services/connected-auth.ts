import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { AuthResult } from "./contracts"
import { createLearningLoopApi, LearningLoopApiError } from "./learning-loop-api"

const providerUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const apiUrl = process.env.NEXT_PUBLIC_QUANTUMLOOP_API_URL

export const connectedAuthConfigured = Boolean(providerUrl && publishableKey && apiUrl)

let provider: SupabaseClient | null = null

export function connectedProvider(): SupabaseClient {
  if (!connectedAuthConfigured) throw new Error("Connected accounts are not configured.")
  if (!provider) provider = createClient(providerUrl!, publishableKey!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return provider
}

export async function connectedAccessToken(): Promise<string | null> {
  if (!connectedAuthConfigured) return null
  const { data, error } = await connectedProvider().auth.getSession()
  if (error) throw error
  return data.session?.access_token ?? null
}

export function connectedLearningLoopApi() {
  if (!connectedAuthConfigured) throw new Error("Connected accounts are not configured.")
  return createLearningLoopApi(`${apiUrl!.replace(/\/$/, "")}/api/v1`, connectedAccessToken)
}

export async function profileForToken(token: string, fetcher: typeof fetch = fetch, baseUrl = apiUrl): Promise<AuthResult> {
  if (!baseUrl) throw new Error("Connected API is not configured.")
  const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "omit",
  })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    const detail = payload && typeof payload === "object" && "error" in payload
      ? (payload as { error?: { code?: unknown; message?: unknown } }).error
      : undefined
    throw new LearningLoopApiError(
      response.status,
      typeof detail?.code === "string" ? detail.code : "profile_unavailable",
      typeof detail?.message === "string" ? detail.message : "Could not load your account profile.",
    )
  }
  const profile: unknown = await response.json()
  if (!profile || typeof profile !== "object") throw new Error("Invalid account profile response.")
  const value = profile as Record<string, unknown>
  if (typeof value.id !== "string" || typeof value.name !== "string" || typeof value.email !== "string" ||
      (value.role !== "learner" && value.role !== "instructor")) {
    throw new Error("Invalid account profile response.")
  }
  const rawPreferences = value.preferences
  if (rawPreferences !== undefined && (!rawPreferences || typeof rawPreferences !== "object" ||
      !["foundations", "algorithms", "hardware"].includes((rawPreferences as Record<string, unknown>).focus as string) ||
      !["guided", "self-paced"].includes((rawPreferences as Record<string, unknown>).pace as string) ||
      typeof (rawPreferences as Record<string, unknown>).reduceMotion !== "boolean")) {
    throw new Error("Invalid account preferences response.")
  }
  return {
    mode: "connected",
    user: { id: value.id, name: value.name, email: value.email, role: value.role },
    ...(rawPreferences ? { preferences: rawPreferences as NonNullable<AuthResult["preferences"]> } : {}),
  }
}

export async function signInConnected(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await connectedProvider().auth.signInWithPassword({ email, password })
  if (error) throw error
  if (!data.session) throw new Error("Sign-in did not create a session.")
  return profileForToken(data.session.access_token)
}

export async function signUpConnected(name: string, email: string, password: string): Promise<AuthResult | null> {
  const { data, error } = await connectedProvider().auth.signUp({
    email,
    password,
    options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/login` },
  })
  if (error) throw error
  return data.session ? profileForToken(data.session.access_token) : null
}

export async function signOutConnected(): Promise<void> {
  if (!connectedAuthConfigured) return
  const { error } = await connectedProvider().auth.signOut({ scope: "local" })
  if (error) throw error
}
