"use client"

import { motion } from "motion/react"

export function TelemetryPanel() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-[#4ADE80]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M2 12h4l2 6 4-14 3 10 2-6h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className="text-xs font-semibold text-white">System telemetry</h3>
      </div>

      <dl className="mt-3 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-white/45">Backend</dt>
          <dd className="font-medium text-white/85">ibm_sim_27q</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-white/45">Status</dt>
          <dd className="flex items-center gap-1.5 font-medium text-[#4ADE80]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
            Operational
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-white/45">Fidelity avg.</dt>
          <dd className="font-medium text-white/85">98.4%</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-white/45">XP earned</dt>
          <dd className="font-medium text-[#00D4FF]">2,340 XP</dd>
        </div>
      </dl>
    </motion.section>
  )
}
