export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 text-white" role="status" aria-label="Loading page">
      <div className="h-4 w-28 animate-pulse rounded bg-[#00D4FF]/20" />
      <div className="mt-5 h-9 w-64 max-w-full animate-pulse rounded-lg bg-white/10" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035]" />)}
      </div>
      <span className="sr-only">Loading page</span>
    </div>
  )
}
