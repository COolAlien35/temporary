import Link from "next/link"
import { LoginCard } from "@/components/quantumloop/login-card"

export default function SignupPage() {
  return <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A0E17] px-5 py-12 text-white">
    <Link href="/" className="mb-8 text-sm font-semibold text-[#00D4FF]">QuantumLoop</Link>
    <h1 className="mb-6 text-3xl font-semibold">Create an account</h1>
    <LoginCard initialMode="signup" />
  </main>
}
