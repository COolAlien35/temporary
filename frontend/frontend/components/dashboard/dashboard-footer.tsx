export function DashboardFooter() {
  return (
    <footer className="mt-10 border-t border-white/10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-6 text-[11px] text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>&copy; {new Date().getFullYear()} QuantumLoop. Learn quantum computing by experimenting.</p>
        <nav className="flex items-center gap-4" aria-label="Footer">
          <a href="#" className="hover:text-white/60">
            Documentation
          </a>
          <a href="#" className="hover:text-white/60">
            Status &amp; Releases
          </a>
          <a href="#" className="hover:text-white/60">
            Preferences
          </a>
        </nav>
      </div>
    </footer>
  )
}
