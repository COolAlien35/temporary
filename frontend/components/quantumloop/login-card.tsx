"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { platformServices } from "@/lib/services"
import { useSession } from "@/store/use-session"
import { useLearnerProgress } from "@/store/use-learner-progress"

type Mode = "login" | "signup"

function destinationAfterSignIn() {
  const next = new URLSearchParams(window.location.search).get("next")
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/home"
}

export function LoginCard({ initialMode = "login" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const startSession = useSession((state) => state.startSession)
  const router = useRouter()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setPending(true)
    try {
      const result = mode === "signup"
        ? await platformServices.auth.signUp(name, email, password)
        : await platformServices.auth.signIn(email, password)
      startSession(result)
      useLearnerProgress.getState().switchLearner(result.user.id)
      router.push(destinationAfterSignIn())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to continue. Please try again.")
    } finally {
      setPending(false)
    }
  }

  function changeMode(next: Mode) {
    setMode(next)
    setError("")
  }

  const inputClass = "w-full rounded-lg border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4FD1E8]/60 focus:ring-2 focus:ring-[#4FD1E8]/30"

  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_60px_-15px_rgba(0,212,255,0.35)] backdrop-blur-xl sm:p-8">
      <p className="mb-5 rounded-lg border border-[#F5B942]/20 bg-[#F5B942]/5 px-3 py-2 text-xs leading-5 text-[#F5B942]">
        Frontend demo: this creates a local session in your browser. No account or password is sent to a server.
      </p>
      <div className="mb-6 flex rounded-full border border-white/10 bg-black/30 p-1 text-sm font-medium" aria-label="Account mode">
        {(["login", "signup"] as const).map((item) => (
          <button key={item} type="button" onClick={() => changeMode(item)} aria-pressed={mode === item} className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${mode === item ? "bg-[#4FD1E8] text-[#0A0E17]" : "text-white/60 hover:text-white"}`}>
            {item === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={submit}>
        {mode === "signup" && <div>
          <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-white/70">Name</label>
          <input id="name" name="name" autoComplete="name" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </div>}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-white/70">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@student.edu" className={inputClass} />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between gap-2">
            <label htmlFor="password" className="text-xs font-medium text-white/70">Password</label>
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="text-xs text-[#4FD1E8]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className={inputClass} />
        </div>
        {mode === "signup" && <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-white/70">Confirm password</label>
          <input id="confirm-password" name="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
        </div>}
        {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-300">{error}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-[#00D4FF] to-[#4FD1E8] px-4 py-2.5 text-sm font-semibold text-[#0A0E17] disabled:cursor-wait disabled:opacity-60">
          {pending ? "Continuing..." : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
      {mode === "login" && <Link href="/forgot-password" className="mt-4 block text-center text-xs text-[#4FD1E8] hover:underline">Forgot password?</Link>}
    </div>
  )
}
