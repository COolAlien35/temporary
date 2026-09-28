"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { AppShell } from "@/components/shared/AppShell"
import { useSession } from "@/store/use-session"
import { useLearnerProgress } from "@/store/use-learner-progress"

export default function SettingsPage() {
  const user = useSession((state) => state.user)
  const updateName = useSession((state) => state.updateName)
  const preferences = useSession((state) => state.preferences)
  const updatePreferences = useSession((state) => state.updatePreferences)
  const resetProgress = useLearnerProgress((state) => state.resetProgress)
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (user) setName(user.name) }, [user])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2) return
    updateName(name.trim())
    setMessage("Profile name saved in this browser.")
  }

  return <AppShell variant="passport">
    <div className="mx-auto max-w-2xl py-8">
      <Link href="/me" className="text-sm text-[#00D4FF]">← Quantum Passport</Link>
      <h1 className="mt-5 text-3xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-white/55">Manage your local demo profile.</p>
      {!mounted ? <p className="mt-8 text-sm text-white/50">Loading settings...</p> : !user ? <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><p className="text-white/65">Sign in to create a local demo profile.</p><Link href="/login?next=/settings" className="mt-4 inline-block text-[#00D4FF]">Go to login →</Link></div> : <form onSubmit={submit} className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[.2em] text-[#F5B942]">Frontend demo profile</p>
        <label htmlFor="profile-name" className="mt-5 block text-sm text-white/70">Display name</label>
        <input id="profile-name" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-[#00D4FF]" />
        <p className="mt-4 text-sm text-white/50">Email: {user.email}</p>
        <p className="mt-1 text-xs text-white/40">Demo progress is stored locally in this browser and is not tied to a server account.</p>
        {message && <p role="status" className="mt-4 text-sm text-[#4ADE80]">{message}</p>}
        <button type="submit" className="mt-6 rounded-lg bg-[#00D4FF] px-4 py-2.5 text-sm font-semibold text-[#0A0E17]">Save name</button>
        <div className="mt-8 border-t border-white/10 pt-6">
          <h2 className="text-sm font-semibold text-white">Learning preferences</h2>
          <p className="mt-1 text-xs text-white/50">Saved to this demo profile for future recommendations.</p>
          <label htmlFor="learning-focus" className="mt-5 block text-sm text-white/70">Learning focus</label>
          <select id="learning-focus" value={preferences.focus} onChange={(event) => updatePreferences({ focus: event.target.value as typeof preferences.focus })} className="mt-2 w-full rounded-lg border border-white/15 bg-[#10141F] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00D4FF]">
            <option value="foundations">Quantum foundations</option>
            <option value="algorithms">Algorithms and circuits</option>
            <option value="hardware">Quantum hardware</option>
          </select>
          <label htmlFor="learning-pace" className="mt-5 block text-sm text-white/70">Learning pace</label>
          <select id="learning-pace" value={preferences.pace} onChange={(event) => updatePreferences({ pace: event.target.value as typeof preferences.pace })} className="mt-2 w-full rounded-lg border border-white/15 bg-[#10141F] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00D4FF]">
            <option value="guided">Guided steps</option>
            <option value="self-paced">Self-paced exploration</option>
          </select>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-4">
            <input type="checkbox" checked={preferences.reduceMotion} onChange={(event) => updatePreferences({ reduceMotion: event.target.checked })} className="mt-0.5 size-4 accent-[#00D4FF]" />
            <span><span className="block text-sm font-medium text-white">Reduce motion</span><span className="mt-1 block text-xs leading-5 text-white/50">Limit decorative animation across the demo. Your device’s reduced-motion setting is always respected.</span></span>
          </label>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6">
          <h2 className="text-sm font-semibold text-white">Demo progress</h2>
          <p className="mt-1 text-xs text-white/50">Clear lessons, quiz scores, lab stages, notes and saved circuits for this demo profile. Other browser data stays intact.</p>
          <button type="button" onClick={() => { if (window.confirm("Reset this demo profile’s learning progress?")) { resetProgress(); setMessage("Demo progress reset for this profile.") } }} className="mt-4 rounded-lg border border-rose-400/40 px-4 py-2 text-sm text-rose-200 hover:bg-rose-400/10">Reset demo progress</button>
        </div>
      </form>}
    </div>
  </AppShell>
}
