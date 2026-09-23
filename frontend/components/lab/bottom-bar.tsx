"use client"

import { useLab } from "@/lib/lab-context"
import { cn } from "@/lib/utils"
import type { ViewTab } from "@/lib/lab-context"

const TABS: { key: ViewTab; label: string }[] = [
  { key: "circuit", label: "Circuit" },
  { key: "code", label: "Code" },
  { key: "histogram", label: "Histogram" },
  { key: "statevector", label: "Statevector" },
  { key: "bloch", label: "Bloch" },
]

export function BottomBar() {
  const { activeTab, setActiveTab, algorithm } = useLab()

  return (
    <footer className="flex h-11 shrink-0 items-center justify-between border-t border-border bg-card/60 px-4">
      <div className="flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="hidden text-[11px] text-muted-foreground sm:block">
        Empirical Loop: <span className="text-emerald-400">Active</span> ({algorithm.slug})
      </p>
    </footer>
  )
}
