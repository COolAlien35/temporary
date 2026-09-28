"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { platformServices } from "@/lib/services"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    setMessage("")
    try {
      const result = await platformServices.auth.requestPasswordReset(email)
      setMessage(result.message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.")
    } finally {
      setPending(false)
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#0A0E17] px-5 text-white">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7">
      <p className="text-xs uppercase tracking-[.2em] text-[#00D4FF]">Account recovery</p>
      <h1 className="mt-3 text-3xl font-semibold">Reset password</h1>
      <p className="mt-3 text-sm leading-6 text-white/55">Recovery email delivery requires an account service. You can check how the request flow behaves in this frontend demo.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><label htmlFor="recovery-email" className="mb-2 block text-sm text-white/70">Email</label><input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-[#00D4FF]" /></div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="rounded-lg border border-[#F5B942]/30 bg-[#F5B942]/10 p-3 text-sm text-[#F5B942]">{message}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#00D4FF] px-4 py-2.5 font-semibold text-[#0A0E17] disabled:opacity-50">{pending ? "Checking..." : "Check recovery"}</button>
      </form>
      {message && <div className="mt-5 border-t border-white/10 pt-4 text-xs text-white/55">
        <p>Preview the link states this frontend is ready to show:</p>
        <div className="mt-2 flex flex-wrap gap-4">
          <Link href="/reset-password?preview=expired" className="text-[#00D4FF]">Expired link</Link>
          <Link href="/reset-password?preview=invalid" className="text-[#00D4FF]">Invalid link</Link>
        </div>
      </div>}
      <Link href="/login" className="mt-5 block text-sm text-[#00D4FF]">← Return to login</Link>
    </div>
  </main>
}
