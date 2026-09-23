"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Send, Sparkles, X } from "lucide-react"
import { askTutor, type TutorAction } from "@/lib/ai/tutor"
import { matchTemplateByPrompt, getTemplate, instantiateTemplate } from "@/lib/studio/templates"
import { useStudio } from "@/store/use-studio"
import { cn } from "@/lib/utils"

const QUICK_ACTIONS: { label: string; action: TutorAction }[] = [
  { label: "Explain this circuit", action: "explain" },
  { label: "What changed since last run?", action: "changed" },
  { label: "Why is my result unexpected?", action: "unexpected" },
  { label: "Suggest an optimization", action: "optimize" },
]

interface Message {
  role: "user" | "tutor"
  text: string
  templateKey?: string
}

export function TutorDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const circuit = useStudio((s) => s.circuit)
  const result = useStudio((s) => s.result)
  const previousResult = useStudio((s) => s.previousResult)
  const loadCircuit = useStudio((s) => s.loadCircuit)
  const [messages, setMessages] = useState<Message[]>([{ role: "tutor", text: "Ask me about this circuit, or try a quick action below." }])
  const [input, setInput] = useState("")

  function respond(prompt: string, action: TutorAction = "generate") {
    setMessages((m) => [...m, { role: "user", text: prompt }])
    if (action === "generate") {
      const template = matchTemplateByPrompt(prompt)
      const text = template ? `Found a match: "${template.name}" \u2014 ${template.description}` : askTutor({ circuit, result, previousResult }, prompt, "generate")
      setMessages((m) => [...m, { role: "tutor", text, templateKey: template?.key }])
      return
    }
    const text = askTutor({ circuit, result, previousResult }, prompt, action)
    setMessages((m) => [...m, { role: "tutor", text }])
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="absolute right-0 top-0 z-40 flex h-full w-80 flex-col border-l border-white/10 bg-[#0A0E17]/98 backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-[#00D4FF]" />
              Circuit Tutor
            </div>
            <button type="button" onClick={onClose} aria-label="Close tutor" className="text-white/40 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="flex flex-col gap-2.5">
              {messages.map((msg, i) => (
                <div key={i} className={cn("max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed", msg.role === "user" ? "ml-auto bg-[#00D4FF]/15 text-white" : "bg-white/5 text-white/80")}>
                  {msg.text}
                  {msg.templateKey && (
                    <button
                      type="button"
                      onClick={() => {
                        const t = getTemplate(msg.templateKey!)
                        if (t) loadCircuit(instantiateTemplate(t))
                      }}
                      className="mt-2 block rounded-md border border-[#00D4FF]/40 px-2 py-1 text-[11px] font-medium text-[#00D4FF] hover:bg-[#00D4FF]/10"
                    >
                      Load into canvas
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-3 py-2">
            {QUICK_ACTIONS.map((qa) => (
              <button key={qa.action} type="button" onClick={() => respond(qa.label, qa.action)} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10">
                {qa.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!input.trim()) return
              respond(input.trim(), "generate")
              setInput("")
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Generate a circuit for: ..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-[#00D4FF]/50 focus:outline-none"
            />
            <button type="submit" aria-label="Send" className="rounded-lg bg-[#00D4FF] p-1.5 text-[#0A0E17]">
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
