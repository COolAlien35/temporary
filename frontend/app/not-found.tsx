import Link from "next/link"
import { AppShell } from "@/components/shared/AppShell"

export default function NotFound() {
  return (
    <AppShell disableBackdrop>
      <div className="mx-auto max-w-xl py-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#00D4FF]">404 · Lost in orbit</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">This page was not found</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">The link may have changed, or this part of QuantumLoop has not been built yet.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/home" className="rounded-xl bg-[#00D4FF] px-5 py-2.5 text-sm font-semibold text-[#0A0E17]">Go to Roadmap</Link>
          <Link href="/curriculum" className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/75">Browse Curriculum</Link>
        </div>
      </div>
    </AppShell>
  )
}
