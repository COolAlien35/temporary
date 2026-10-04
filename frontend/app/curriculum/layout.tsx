"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/store/use-session"

export default function CurriculumLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const mode = useSession((state) => state.mode)

  if (mode === "connected" && path !== "/curriculum") {
    return <main className="flex min-h-screen items-center justify-center bg-[#0A0E17] px-5 py-12 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-[#4FD1E8]/25 bg-[#4FD1E8]/[0.05] p-7">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#4FD1E8]">Connected curriculum</p>
        <h1 className="mt-3 text-2xl font-semibold">This lesson uses demo progress</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">This page has not been connected to your account yet. Continue in the Superposition lab to save your prediction, circuit, run, comparison, and tutor messages.</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/lab/superposition" className="rounded-full bg-[#4FD1E8] px-4 py-2 font-semibold text-[#0A0E17]">Open connected Superposition lab</Link>
          <Link href="/curriculum" className="rounded-full border border-white/20 px-4 py-2 text-white">Back to curriculum</Link>
        </div>
      </section>
    </main>
  }
  return children
}
