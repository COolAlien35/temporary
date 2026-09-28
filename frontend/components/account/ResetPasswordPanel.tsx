"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { platformServices } from "@/lib/services"
import type { ResetLinkState } from "@/lib/services/contracts"

type PanelState = ResetLinkState | "missing" | "checking" | "error" | "success"

const copy: Record<Exclude<PanelState, "valid">, { title: string; description: string }> = {
  missing: { title: "Reset link missing", description: "Open your recovery link, or request a new one from the account recovery page." },
  checking: { title: "Checking reset link", description: "Please wait while this link is checked." },
  expired: { title: "Reset link expired", description: "This link can no longer be used. Request a new recovery link to continue." },
  invalid: { title: "Reset link invalid", description: "This link could not be verified. Request a new recovery link to continue." },
  unavailable: { title: "Reset unavailable in demo", description: "This frontend demo cannot verify reset links or change passwords. No password has been changed." },
  error: { title: "Could not check reset link", description: "The account service did not respond. Retry the check or request a new recovery link." },
  success: { title: "Password updated", description: "Your password has been changed. You can now sign in with the new password." },
}

export function ResetPasswordPanel({ token, preview }: { token: string | null; preview: "expired" | "invalid" | null }) {
  const [status, setStatus] = useState<PanelState>(preview ?? (token ? "checking" : "missing"))
  const [retry, setRetry] = useState(0)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token || preview) return
    let active = true
    platformServices.auth.inspectResetLink(token)
      .then((result) => { if (active) setStatus(result.state) })
      .catch(() => { if (active) setStatus("error") })
    return () => { active = false }
  }, [token, preview, retry])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || status !== "valid") return
    setError("")
    if (password !== confirmation) {
      setError("Passwords do not match.")
      return
    }
    setPending(true)
    try {
      await platformServices.auth.confirmPasswordReset(token, password)
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
    <p className="text-xs uppercase tracking-[.2em] text-[#F5B942]">{preview ? "Demo link-state preview" : "Account recovery"}</p>
    <h1 className="mt-3 text-3xl font-semibold">{status === "valid" ? "Choose a new password" : copy[status].title}</h1>
    <p className="mt-3 text-sm leading-6 text-white/55">{status === "valid" ? "Use a password of at least eight characters." : copy[status].description}</p>
    {preview && <p className="mt-4 rounded-lg border border-[#F5B942]/25 bg-[#F5B942]/5 p-3 text-xs text-[#F5B942]">This is a visual preview. No token was checked and no recovery email was sent.</p>}

    {status === "valid" && <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="new-password" className="block text-sm text-white/70">New password</label>
        <input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-[#00D4FF]" />
      </div>
      <div>
        <label htmlFor="confirm-new-password" className="block text-sm text-white/70">Confirm new password</label>
        <input id="confirm-new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-[#00D4FF]" />
      </div>
      <button type="button" onClick={() => setShowPassword((current) => !current)} className="text-xs text-[#00D4FF]">{showPassword ? "Hide passwords" : "Show passwords"}</button>
      {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#00D4FF] px-4 py-2.5 text-sm font-semibold text-[#0A0E17] disabled:cursor-wait disabled:opacity-50">{pending ? "Updating..." : "Update password"}</button>
    </form>}

    {status === "error" && <button type="button" onClick={() => { setStatus("checking"); setRetry((current) => current + 1) }} className="mt-6 rounded-lg bg-[#00D4FF] px-4 py-2.5 text-sm font-semibold text-[#0A0E17]">Retry check</button>}
    {status !== "valid" && status !== "checking" && <div className="mt-6 flex flex-wrap gap-4 text-sm">
      {status !== "success" && <Link href="/forgot-password" className="font-semibold text-[#00D4FF]">Request a new link →</Link>}
      <Link href="/login" className="text-white/60 hover:text-white">Return to login</Link>
    </div>}
  </div>
}
