"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { algorithmConfigs } from "@/lib/algorithms"
import { hardwareNavigation, primaryNavigation, secondaryNavigation } from "@/lib/navigation"

export function CommandPalette({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const router = useRouter()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) return
      event.preventDefault()
      setOpen((current) => !current)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  const pages = [...primaryNavigation, ...secondaryNavigation, ...hardwareNavigation]
  const algorithms = Object.values(algorithmConfigs)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden border-white/10 bg-[#0A0E17] p-0 shadow-lg shadow-[#00D4FF]/10">
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-white/50 [&_[cmdk-item]]:cursor-pointer [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:text-white/70 [&_[cmdk-item][aria-selected='true']]:bg-white/10 [&_[cmdk-item][aria-selected='true']]:text-white">
          <Command.Input aria-label="Search pages and algorithms" placeholder="Search pages and algorithms..." className="w-full border-b border-white/10 bg-[#0A0E17] px-4 py-3 text-sm text-white outline-none" />
          <Command.List className="max-h-[400px] overflow-y-auto py-2">
            <Command.Empty className="py-6 text-center text-sm text-white/50">No results found.</Command.Empty>
            <Command.Group heading="Pages">
              {pages.map((item) => (
                <Command.Item key={item.href} value={`${item.label} ${item.href}`} onSelect={() => navigate(item.href)}>
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Algorithms">
              {algorithms.map((config) => (
                <Command.Item key={config.meta.slug} value={`${config.meta.title} ${config.meta.slug}`} onSelect={() => navigate(`/lab/${config.meta.slug}`)}>
                  {config.meta.title}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
