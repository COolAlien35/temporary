"use client"

import { useState } from "react"
import { ChevronDown, Sparkles } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { cn } from "@/lib/utils"

export function LabPartnerChat({
  introMessage,
  hints,
}: {
  introMessage: string
  hints: string[]
}) {
  const { incrementHints } = useLab()
  const [hintsOpen, setHintsOpen] = useState(false)
  const [messages, setMessages] = useState<{ id: string; from: "partner" | "user"; text: string }[]>([
    { id: "m0", from: "partner", text: introMessage },
  ])
  const [input, setInput] = useState("")

  const handleAsk = () => {
    if (!input.trim()) return
    const userText = input.trim()
    setMessages((prev) => [
      ...prev,
      { id: `u-${prev.length}`, from: "user", text: userText },
      {
        id: `p-${prev.length + 1}`,
        from: "partner",
        text: "Good question — trace the amplitude through each gate layer and check where interference would cancel or reinforce it.",
      },
    ])
    setInput("")
  }

  const handleHintClick = (hint: string) => {
    incrementHints()
    setMessages((prev) => [
      ...prev,
      { id: `u-${prev.length}`, from: "user", text: hint },
      { id: `p-${prev.length + 1}`, from: "partner", text: "Here's a nudge in that direction \u2014 keep tracing the amplitude sign through each layer before you commit to a fix." },
    ])
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/60">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-3.5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Lab Partner</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                m.from === "partner"
                  ? "bg-secondary text-foreground"
                  : "ml-auto bg-primary/15 text-primary",
              )}
            >
              {m.text}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={() => setHintsOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          Need a hint? Socratic Hint Ladder
          <ChevronDown className={cn("size-3.5 transition-transform", hintsOpen && "rotate-180")} />
        </button>
        {hintsOpen && (
          <div className="mt-2 flex flex-wrap gap-1.5 px-2">
            {hints.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => handleHintClick(hint)}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {hint}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-3 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAsk()
          }}
          placeholder="Ask your lab partner..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={handleAsk}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-primary/80"
        >
          Ask
        </button>
      </div>
    </div>
  )
}
