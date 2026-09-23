"use client"

import { toast } from "sonner"
import { TEMPLATES, instantiateTemplate } from "@/lib/studio/templates"
import { useStudio } from "@/store/use-studio"

export function TemplatesPanel() {
  const loadCircuit = useStudio((s) => s.loadCircuit)

  return (
    <div className="flex flex-col gap-1.5">
      {TEMPLATES.map((template) => (
        <button
          key={template.key}
          type="button"
          onClick={() => {
            loadCircuit(instantiateTemplate(template))
            toast.success(`Loaded ${template.name}`)
          }}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-[#00D4FF]/40 hover:bg-white/[0.06]"
        >
          <p className="text-xs font-semibold text-white">{template.name}</p>
          <p className="mt-0.5 text-[11px] text-white/45">{template.description}</p>
        </button>
      ))}
    </div>
  )
}
