"use client"

import { motion } from "motion/react"

export function GateBox({ label, x, y, active }: { label: string; x: number; y: number; active?: boolean }) {
  return <motion.g animate={{ opacity: active ? 1 : 0.55 }}><rect x={x} y={y} width="58" height="42" rx="8" fill={active ? "#00D4FF" : "#17283c"} fillOpacity={active ? 0.18 : 1} stroke={active ? "#00D4FF" : "#35506a"} /><text x={x + 29} y={y + 27} textAnchor="middle" fill={active ? "#00D4FF" : "#d8e6f2"} fontSize="16" fontWeight="700">{label}</text></motion.g>
}

export function WireLine({ y, active }: { y: number; active?: boolean }) { return <><line x1="70" x2="730" y1={y} y2={y} stroke="#35506a" strokeWidth="2" />{active && <motion.circle cx="100" cy={y} r="5" fill="#00D4FF" animate={{ cx: [100, 700] }} transition={{ duration: 1.2, repeat: Infinity }} />}</> }

export function QubitOrb({ x, y, label, phase = "#00D4FF" }: { x: number; y: number; label: string; phase?: string }) { return <motion.g animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}><circle cx={x} cy={y} r="28" fill={phase} fillOpacity=".14" stroke={phase} strokeWidth="2"/><text x={x} y={y + 5} textAnchor="middle" fill="#f8fbff" fontSize="13">{label}</text></motion.g> }

export function AmplitudeBars({ values, labels }: { values: number[]; labels: string[] }) { const max = Math.max(...values.map(v => Math.abs(v)), 1); return <g><line x1="180" x2="620" y1="310" y2="310" stroke="#526a80"/><line x1="180" x2="180" y1="95" y2="330" stroke="#526a80"/>{values.map((v, i) => { const h = Math.abs(v) / max * 150; const x = 220 + i * (360 / Math.max(values.length, 1)); return <g key={labels[i]}><motion.rect x={x} width="52" rx="5" fill={i === values.length - 1 ? "#F5B942" : "#00D4FF"} animate={{ y: v >= 0 ? 310 - h : 310, height: h }} /><text x={x + 26} y="345" textAnchor="middle" fill="#a8bbca" fontSize="13">{labels[i]}</text><text x={x + 26} y={v >= 0 ? 300 - h : 330 + h} textAnchor="middle" fill="#d8e6f2" fontSize="11">{v.toFixed(2)}</text></g>})}</g> }

export function ComingSoonScene() { return <g><text x="400" y="200" textAnchor="middle" fill="#00D4FF" fontSize="24" fontWeight="700">Animation coming soon</text><text x="400" y="235" textAnchor="middle" fill="#9db1c1" fontSize="14">This walkthrough is being prepared.</text></g> }
