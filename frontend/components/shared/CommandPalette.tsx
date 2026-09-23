"use client"

import { useEffect, useState } from "react"
import { Command } from "cmdk"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { algorithmConfigs } from "@/lib/algorithms/index"
import { mockDocsArticles } from "@/lib/mock/docs"

export function CommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const algorithms = Object.values(algorithmConfigs).map((config) => ({
    id: `algo-${config.meta.slug}`,
    title: config.meta.title,
    category: "Algorithms",
    href: `/lab/${config.meta.slug}`,
  }))

  const pages = [
    { id: "page-home", title: "Roadmap", category: "Pages", href: "/home" },
    { id: "page-curriculum", title: "Curriculum", category: "Pages", href: "/curriculum" },
    { id: "page-studio", title: "Circuit Studio", category: "Pages", href: "/studio" },
    { id: "page-cohorts", title: "Cohorts", category: "Pages", href: "/cohorts" },
    { id: "page-docs", title: "Docs", category: "Pages", href: "/docs" },
    { id: "page-me", title: "Quantum Passport", category: "Pages", href: "/me" },
  ]

  const docs = mockDocsArticles.map((article) => ({
    id: `doc-${article.id}`,
    title: article.title,
    category: "Documentation",
    href: `/docs#${article.id}`,
  }))

  const actions = [
    { id: "action-new-circuit", title: "New Circuit", category: "Quick Actions", shortcut: "⌘+N" },
    { id: "action-resume-lab", title: "Resume Lab", category: "Quick Actions", shortcut: "⌘+R" },
    { id: "action-open-notebook", title: "Open Notebook", category: "Quick Actions", shortcut: "⌘+O" },
  ]

  const items = [...pages, ...algorithms, ...docs, ...actions]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden border-white/10 bg-[#0A0E17] p-0 shadow-lg shadow-[#00D4FF]/10">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-white/50 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:overflow-hidden [&_[cmdk-input]]:border-0 [&_[cmdk-input]]:bg-[#0A0E17] [&_[cmdk-input]]:text-white [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:text-white/70 [&_[cmdk-item]]:cursor-pointer [&_[cmdk-item][aria-selected='true']]:bg-white/10 [&_[cmdk-item][aria-selected='true']]:text-white [&_[cmdk-separator]]:bg-white/10">
          <Command.Input placeholder="Search algorithms, pages, docs..." className="border-b border-white/10 px-4 py-3 text-sm outline-none" />
          <Command.List className="max-h-[400px] overflow-y-auto">
            <Command.Empty className="py-6 text-center text-sm text-white/50">No results found.</Command.Empty>

            <Command.Group heading="Pages">
              {pages.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    window.location.href = item.href
                    setOpen(false)
                  }}
                >
                  {item.title}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Algorithms">
              {algorithms.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    window.location.href = item.href
                    setOpen(false)
                  }}
                >
                  {item.title}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Documentation">
              {docs.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    window.location.href = item.href
                    setOpen(false)
                  }}
                >
                  {item.title}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Quick Actions">
              {actions.map((item) => (
                <Command.Item key={item.id} value={item.id} onSelect={() => setOpen(false)}>
                  <div className="flex w-full items-center justify-between">
                    <span>{item.title}</span>
                    <span className="text-xs text-white/40">{item.shortcut}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
