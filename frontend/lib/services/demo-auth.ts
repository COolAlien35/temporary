import type { AuthResult, AuthService } from "./contracts"

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function displayName(email: string) {
  const firstPart = email.split("@")[0] || "Explorer"
  return firstPart.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export const demoAuth: AuthService = {
  async signIn(email, password): Promise<AuthResult> {
    await delay(250)
    if (!email.includes("@") || password.length < 8) throw new Error("Enter a valid email and a password of at least 8 characters.")
    return { user: { id: `demo-${email.toLowerCase()}`, name: displayName(email), email: email.toLowerCase(), role: "learner" }, mode: "demo" }
  },
  async signUp(name, email, password): Promise<AuthResult> {
    await delay(250)
    if (name.trim().length < 2) throw new Error("Enter your name to continue.")
    if (!email.includes("@") || password.length < 8) throw new Error("Enter a valid email and a password of at least 8 characters.")
    return { user: { id: `demo-${email.toLowerCase()}`, name: name.trim(), email: email.toLowerCase(), role: "learner" }, mode: "demo" }
  },
  async requestPasswordReset(email) {
    await delay(250)
    if (!email.includes("@")) throw new Error("Enter a valid email address.")
    return { delivered: false, message: "This frontend demo cannot send recovery emails. You can return to the demo sign-in page." }
  },
  async inspectResetLink() {
    await delay(250)
    return { state: "unavailable" }
  },
  async confirmPasswordReset() {
    await delay(250)
    throw new Error("Password reset is unavailable in this frontend demo. No password was changed.")
  },
}
