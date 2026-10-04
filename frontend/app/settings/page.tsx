"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { AppShell } from "@/components/shared/AppShell"
import { useSession } from "@/store/use-session"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import { LearningLoopApiError, type ConnectedProfile } from "@/lib/services/learning-loop-api"
import type { LearningPreferences } from "@/lib/services/contracts"

export default function SettingsPage() {
  const user = useSession((state) => state.user)
  const mode = useSession((state) => state.mode)
  const updateName = useSession((state) => state.updateName)
  const preferences = useSession((state) => state.preferences)
  const updatePreferences = useSession((state) => state.updatePreferences)
  const resetProgress = useLearnerProgress((state) => state.resetProgress)
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState("")
  const [draftPreferences, setDraftPreferences] = useState<LearningPreferences>(preferences)
  const [serverProfile, setServerProfile] = useState<ConnectedProfile | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (mode !== "connected" || !user) {
      setServerProfile(null)
      setName(user?.name ?? "")
      setDraftPreferences(preferences)
      return
    }
    const ownerId = user.id
    let active = true
    setServerProfile(null)
    setLoading(true)
    setError("")
    void connectedLearningLoopApi().getProfile().then((profile) => {
      if (!active || useSession.getState().user?.id !== ownerId) return
      if (profile.id !== ownerId) throw new Error("Account profile does not match the signed-in user.")
      setServerProfile(profile)
      setName(profile.name)
      setDraftPreferences(profile.preferences)
      updateName(profile.name)
      updatePreferences(profile.preferences)
    }).catch((cause: unknown) => {
      if (active && useSession.getState().user?.id === ownerId) setError(cause instanceof Error ? cause.message : "Could not load account settings.")
    }).finally(() => { if (active && useSession.getState().user?.id === ownerId) setLoading(false) })
    return () => { active = false }
  // Account identity changes trigger a fresh server read; local preference updates must not refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id, refreshKey])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2) return
    setError("")
    setMessage("")
    if (mode !== "connected") {
      updateName(name.trim())
      setMessage("Profile name saved in this browser.")
      return
    }
    if (!user || !serverProfile || saving) return
    const ownerId = user.id
    setSaving(true)
    try {
      const updated = await connectedLearningLoopApi().updateProfile({ name: name.trim(), preferences: draftPreferences }, serverProfile.revision)
      if (useSession.getState().mode !== "connected" || useSession.getState().user?.id !== ownerId) return
      if (updated.id !== ownerId) throw new Error("Account profile does not match the signed-in user.")
      setServerProfile(updated)
      setName(updated.name)
      setDraftPreferences(updated.preferences)
      updateName(updated.name)
      updatePreferences(updated.preferences)
      setMessage("Account settings saved.")
    } catch (cause) {
      if (useSession.getState().user?.id !== ownerId) return
      if (cause instanceof LearningLoopApiError && cause.status === 412) {
        try {
          const latest = await connectedLearningLoopApi().getProfile()
          if (useSession.getState().user?.id !== ownerId) return
          if (latest.id !== ownerId) throw new Error("Account profile does not match the signed-in user.")
          setServerProfile(latest)
          setName(latest.name)
          setDraftPreferences(latest.preferences)
          updateName(latest.name)
          updatePreferences(latest.preferences)
          setError("Settings changed on another device. Latest values are shown; review them before saving again.")
        } catch (reloadCause) {
          if (useSession.getState().user?.id === ownerId) setError(reloadCause instanceof Error ? reloadCause.message : "Could not reload account settings.")
        }
      } else setError(cause instanceof Error ? cause.message : "Could not save account settings.")
    } finally {
      if (useSession.getState().user?.id === ownerId) setSaving(false)
    }
  }

  const shownPreferences = mode === "connected" ? draftPreferences : preferences
  function changePreferences(changes: Partial<LearningPreferences>) {
    if (mode === "connected") setDraftPreferences((current) => ({ ...current, ...changes }))
    else updatePreferences(changes)
  }

  return <AppShell variant="passport">
    <div className="mx-auto max-w-2xl py-8">
      <Link href="/me" className="text-sm text-[#00D4FF]">← Quantum Passport</Link>
      <h1 className="mt-5 text-3xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-white/55">{mode === "connected" ? "Manage your saved account settings." : "Manage your local demo profile."}</p>
      {!mounted || loading ? <p className="mt-8 text-sm text-white/50">Loading settings...</p> : !user ? <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><p className="text-white/65">Sign in to manage your profile.</p><Link href="/login?next=/settings" className="mt-4 inline-block text-[#00D4FF]">Go to login →</Link></div> : <form onSubmit={(event) => void submit(event)} className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[.2em] text-[#F5B942]">{mode === "connected" ? "Connected account" : "Frontend demo profile"}</p>
        <label htmlFor="profile-name" className="mt-5 block text-sm text-white/70">Display name</label>
        <input id="profile-name" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-[#00D4FF]" />
        <p className="mt-4 text-sm text-white/50">Email: {user.email}</p>
        <p className="mt-1 text-xs text-white/40">{mode === "connected" ? "Name and preferences are saved to your account." : "Demo progress is stored locally in this browser and is not tied to a server account."}</p>
        {message && <p role="status" className="mt-4 text-sm text-[#4ADE80]">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-200">{error} {mode === "connected" && !serverProfile && <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="underline">Retry loading settings</button>}</p>}
        <button type="submit" disabled={saving || (mode === "connected" && !serverProfile)} className="mt-6 rounded-lg bg-[#00D4FF] px-4 py-2.5 text-sm font-semibold text-[#0A0E17] disabled:opacity-50">{saving ? "Saving…" : mode === "connected" ? "Save account settings" : "Save name"}</button>
        <div className="mt-8 border-t border-white/10 pt-6">
          <h2 className="text-sm font-semibold text-white">Learning preferences</h2>
          <p className="mt-1 text-xs text-white/50">{mode === "connected" ? "Saved with your account." : "Saved to this demo profile for future recommendations."}</p>
          <label htmlFor="learning-focus" className="mt-5 block text-sm text-white/70">Learning focus</label>
          <select id="learning-focus" value={shownPreferences.focus} onChange={(event) => changePreferences({ focus: event.target.value as LearningPreferences["focus"] })} className="mt-2 w-full rounded-lg border border-white/15 bg-[#10141F] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00D4FF]">
            <option value="foundations">Quantum foundations</option>
            <option value="algorithms">Algorithms and circuits</option>
            <option value="hardware">Quantum hardware</option>
          </select>
          <label htmlFor="learning-pace" className="mt-5 block text-sm text-white/70">Learning pace</label>
          <select id="learning-pace" value={shownPreferences.pace} onChange={(event) => changePreferences({ pace: event.target.value as LearningPreferences["pace"] })} className="mt-2 w-full rounded-lg border border-white/15 bg-[#10141F] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00D4FF]">
            <option value="guided">Guided steps</option>
            <option value="self-paced">Self-paced exploration</option>
          </select>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-4">
            <input type="checkbox" checked={shownPreferences.reduceMotion} onChange={(event) => changePreferences({ reduceMotion: event.target.checked })} className="mt-0.5 size-4 accent-[#00D4FF]" />
            <span><span className="block text-sm font-medium text-white">Reduce motion</span><span className="mt-1 block text-xs leading-5 text-white/50">Limit decorative animation across the demo. Your device’s reduced-motion setting is always respected.</span></span>
          </label>
        </div>
        {mode === "demo" && <div className="mt-8 border-t border-white/10 pt-6">
          <h2 className="text-sm font-semibold text-white">Demo progress</h2>
          <p className="mt-1 text-xs text-white/50">Clear lessons, quiz scores, lab stages, notes and saved circuits for this demo profile. Other browser data stays intact.</p>
          <button type="button" onClick={() => { if (window.confirm("Reset this demo profile’s learning progress?")) { resetProgress(); setMessage("Demo progress reset for this profile.") } }} className="mt-4 rounded-lg border border-rose-400/40 px-4 py-2 text-sm text-rose-200 hover:bg-rose-400/10">Reset demo progress</button>
        </div>}
      </form>}
    </div>
  </AppShell>
}
