"use client"

import { useMemo, useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { COMPONENTS } from "@/lib/hardware/components"
import { useHardware } from "@/store/use-hardware"

const CATEGORIES = ["All", "Passive", "Active", "Interface", "Device", "Sensor"] as const

interface CatalogPaletteProps {
  armedComponentId: string | null
  onArm: (componentId: string | null) => void
}

export function CatalogPalette({ armedComponentId, onArm }: CatalogPaletteProps) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All")
  const favorites = useHardware((s) => s.favorites)
  const toggleFavorite = useHardware((s) => s.toggleFavorite)

  const filtered = useMemo(() => {
    return COMPONENTS.filter((c) => {
      if (category !== "All" && c.category !== category) return false
      if (query && !`${c.name} ${c.abbreviation}`.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [query, category])

  return (
    <div className="flex h-full flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search components..."
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-[#00D4FF]/40 focus:outline-none"
      />
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              category === c ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white/80",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {filtered.map((c) => {
          const isArmed = armedComponentId === c.id
          const isFav = favorites.includes(c.id)
          return (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                isArmed ? "border-orange-400/50 bg-orange-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20",
              )}
            >
              <button onClick={() => onArm(isArmed ? null : c.id)} className="flex flex-1 items-center gap-2 text-left">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-semibold text-white">
                  {c.abbreviation}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-white">{c.name}</span>
                  <span className="block truncate text-[10px] text-white/40">{c.category}</span>
                </span>
              </button>
              <button
                onClick={() => toggleFavorite(c.id)}
                aria-label={isFav ? `Remove ${c.name} from favorites` : `Add ${c.name} to favorites`}
                className="shrink-0 text-white/30 hover:text-[#FFB800]"
              >
                <Star className={cn("h-3.5 w-3.5", isFav && "fill-[#FFB800] text-[#FFB800]")} />
              </button>
            </div>
          )
        })}
        {filtered.length === 0 && <p className="py-6 text-center text-xs text-white/40">No components match.</p>}
      </div>
    </div>
  )
}
