"use client"

import { useState } from "react"
import { motion } from "motion/react"

export function LoginCard() {
  const [mode, setMode] = useState<"login" | "signup">("login")

  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_60px_-15px_rgba(0,212,255,0.35)] backdrop-blur-xl sm:p-8">
      <div className="mb-6 flex rounded-full border border-white/10 bg-black/30 p-1 text-sm font-medium">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`relative flex-1 rounded-full px-3 py-1.5 transition-colors ${
              mode === m ? "text-[#0A0E17]" : "text-white/60 hover:text-white"
            }`}
          >
            {mode === m && (
              <motion.span
                layoutId="auth-toggle-pill"
                className="absolute inset-0 rounded-full bg-[#4FD1E8]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{m === "login" ? "Log in" : "Sign up"}</span>
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-white/60">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@student.edu"
            autoComplete="email"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#4FD1E8]/60 focus:ring-1 focus:ring-[#4FD1E8]/40"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-white/60">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#4FD1E8]/60 focus:ring-1 focus:ring-[#4FD1E8]/40"
          />
        </div>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-lg bg-gradient-to-r from-[#00D4FF] to-[#4FD1E8] px-4 py-2.5 text-sm font-semibold text-[#0A0E17] shadow-[0_0_25px_-5px_rgba(0,212,255,0.7)] transition-shadow hover:shadow-[0_0_35px_-5px_rgba(0,212,255,0.9)]"
        >
          {mode === "login" ? "Log in" : "Create account"}
        </motion.button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/40">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white"
      >
        <img
          src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google/default.svg"
          alt=""
          className="h-4 w-4"
        />
        Continue with Google
      </button>

      <p className="mt-5 text-center text-xs text-white/35">
        {mode === "login" ? "New to QuantumLoop? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="font-medium text-[#4FD1E8] hover:underline"
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </button>
      </p>
    </div>
  )
}
