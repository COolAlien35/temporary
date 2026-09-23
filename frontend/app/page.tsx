import { ParticleField } from "@/components/quantumloop/particle-field"
import { HeroSection } from "@/components/quantumloop/hero-section"
import { ScrollAtomSection } from "@/components/quantumloop/scroll-atom-section"
import { HowItWorksSection } from "@/components/quantumloop/how-it-works-section"
import { PredictSection } from "@/components/quantumloop/predict-section"
import { AiTutorSection } from "@/components/quantumloop/ai-tutor-section"
import { CtaFooter } from "@/components/quantumloop/cta-footer"

export default function Page() {
  return (
    <main className="relative min-h-screen bg-[#0A0E17] text-white">
      <ParticleField />
      <div className="relative z-10">
        <HeroSection />
        <ScrollAtomSection />
        <HowItWorksSection />
        <PredictSection />
        <AiTutorSection />
        <CtaFooter />
      </div>
    </main>
  )
}
