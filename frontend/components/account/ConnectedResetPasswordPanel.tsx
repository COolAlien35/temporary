"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { connectedRecoverySessionAvailable, updateConnectedPassword } from "@/lib/services/connected-auth"

export function ConnectedResetPasswordPanel() {
  const [status, setStatus] = useState<"checking" | "valid" | "invalid" | "success">("checking")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    if (fragment.has("error")) {
      setStatus("invalid")
      return
    }
    connectedRecoverySessionAvailable()
      .then((available) => { if (active) setStatus(available ? "valid" : "invalid") })
      .catch(() => { if (active) setStatus("invalid") })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (password !== confirmation) {
      setError("Passwords do not match.")
      return
    }
    setPending(true)
    try {
      await updateConnectedPassword(password)
      setPassword("")
      setConfirmation("")
      setStatus("success")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset password. Please retry.")
    } finally {
      setPending(false)
    }
  }

  return <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7">
    <p className="text-xs uppercase tracking-[.2em] text-[#F5B942]">Supabase account recovery</p>
    <h1 className="mt-3 text-3xl font-semibold">{status === "checking" ? "Checking reset link" : status === "valid" ? "Choose a new password" : status === "success" ? "Password updated" : "Reset link invalid or expired"}</h1>
    <p className="mt-3 text-sm leading-6 text-white/55">{status === "valid" ? "Use a password of at least eight characters." : status === "success" ? "Your password has been changed. Sign in with the new password." : status === "invalid" ? "Request a new recovery link to continue." : "Please wait while your account link is checked."}</p>
    {status === "valid" && <form onSubmit={submit} className="mt-6 space-y-4">
      <div><label htmlFor="new-password" className="block text-sm text-white/70">New password</label><input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white" /></div>
      <div><label htmlFor="confirm-new-password" className="block text-sm text-white/70">Confirm new password</label><input id="confirm-new-password" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white" /></div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#00D4FF] px-4 py-2.5 font-semibold text-[#0A0E17] disabled:opacity-50">{pending ? "Updating..." : "Update password"}</button>
    </form>}
    {status !== "checking" && <div className="mt-6 flex gap-4 text-sm">
      {status === "invalid" && <Link href="/forgot-password" className="text-[#00D4FF]">Request a new link</Link>}
      <Link href="/login" className="text-white/60">Return to login</Link>
    </div>}
  </div>
}
