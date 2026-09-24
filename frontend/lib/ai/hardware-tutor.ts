import { COMPONENT_MAP } from "@/lib/hardware/components"
import { LINES } from "@/lib/hardware/lines"
import { STAGES } from "@/lib/hardware/stages"
import type { Design, Issue } from "@/lib/hardware/types"

export interface TutorMessage {
  id: string
  role: "assistant" | "user"
  text: string
}

/**
 * A deterministic, rule-based "tutor" — no network calls. Answers are assembled from
 * canned explanations keyed off keywords, plus live context (issues, stage loads).
 */
export function answerHardwareQuestion(question: string, design: Design, issues: Issue[]): string {
  const q = question.toLowerCase()

  if (q.includes("issue") || q.includes("wrong") || q.includes("error")) {
    if (issues.length === 0) return "No issues detected in the current design — nice work. Run Thermal Analysis to double check heat loads."
    const top = issues.slice(0, 3).map((i) => `• ${i.title}: ${i.message}`).join("\n")
    return `Here's what I'm seeing:\n${top}${issues.length > 3 ? `\n…and ${issues.length - 3} more. Open the Checks panel for the full list.` : ""}`
  }

  for (const comp of Object.values(COMPONENT_MAP)) {
    if (q.includes(comp.name.toLowerCase()) || q.includes(comp.id)) {
      return `${comp.name}: ${comp.description} Typical stages: ${comp.compatibleStages.filter((c) => c.preferred).map((c) => c.stageId).join(", ") || comp.compatibleStages.map((c) => c.stageId).join(", ")}.`
    }
  }

  for (const line of Object.values(LINES)) {
    if (q.includes(line.label.toLowerCase()) || q.includes(line.id)) {
      return `${line.label}: ${line.description} Reference attenuation budget: ${line.totalAttenuationDb} dB total.`
    }
  }

  for (const stage of Object.values(STAGES)) {
    if (q.includes(stage.label.toLowerCase()) || q.includes(stage.temperatureLabel.toLowerCase())) {
      return `${stage.label} (${stage.temperatureLabel}): ${stage.description}${stage.coolingPowerW ? ` Cooling power budget: ~${stage.coolingPowerW} W.` : ""}`
    }
  }

  if (q.includes("attenuat")) {
    return "Attenuators drop signal power as heat, stage by stage, so that the noise riding on a microwave drive line is thermalized down to the temperature of each plate before it reaches the qubit. Splitting the total attenuation across several stages (rather than one big attenuator at the bottom) keeps any single stage's heat load small."
  }
  if (q.includes("hemt") || q.includes("amplif")) {
    return "The HEMT at 4K is the first big-gain stage on the way out. Its noise temperature sets a floor on the whole readout chain's sensitivity, which is why it sits as close to the qubit as the cooling power budget allows — 4K has plenty of cooling power (~1.5W) to spare for the HEMT's DC bias dissipation."
  }
  if (q.includes("thermal") || q.includes("heat") || q.includes("cool")) {
    return "Cooling power shrinks by roughly an order of magnitude at each colder stage — 40W at 50K down to tens of microwatts at the mixing chamber. Every cable and every active component you place on a stage eats into that budget. Run Thermal Analysis to see per-stage utilization."
  }

  return "I can answer questions about specific components (try asking about the HEMT, attenuator, or circulator), line types (XY, Flux, Readout), stages (4K, MXC, ...), or say \"what's wrong\" to get a summary of the current design's issues."
}
