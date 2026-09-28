"use client"

import Link from "next/link"
import { AppShell } from "@/components/shared/AppShell"

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <AppShell disableBackdrop>
      <div className="mx-auto max-w-xl py-24 text-center" role="alert">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#F5B942]">Temporary interruption</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">This page could not load</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">Try again. Your saved work is still in this browser.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={retry} className="rounded-xl bg-[#00D4FF] px-5 py-2.5 text-sm font-semibold text-[#0A0E17]">Try again</button>
          <Link href="/home" className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/75">Go to Roadmap</Link>
        </div>
      </div>
    </AppShell>
  )
}
