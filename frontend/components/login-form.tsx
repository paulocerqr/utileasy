"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" })
      const csrfData = await csrfResponse.json()
      if (!csrfResponse.ok) throw new Error("Não foi possível iniciar a sessão.")

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfData.csrf_token,
        },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || "Não foi possível entrar.")
      const pendingJobs = [
        {
          storageKey: "utileazy:pending-anonymous-job",
          apiPath: "transcriptions",
          destination: "/transcrisao",
        },
        {
          storageKey: "utileazy:pending-anonymous-document-job",
          apiPath: "documents",
          destination: "/pdf-docx",
        },
      ]
      let destination = "/transcrisao"
      for (const pendingJob of pendingJobs) {
        const pendingRaw = sessionStorage.getItem(pendingJob.storageKey)
        if (!pendingRaw) continue
        try {
          const pending = JSON.parse(pendingRaw) as { id: string; token: string }
          const claimCsrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" })
          const claimCsrfData = await claimCsrfResponse.json()
          if (!claimCsrfResponse.ok || !claimCsrfData?.csrf_token) {
            throw new Error("Não foi possível renovar o CSRF após o login.")
          }
          const claimResponse = await fetch(`/api/${pendingJob.apiPath}/${pending.id}/claim`, {
            method: "POST",
            headers: {
              "X-CSRFToken": claimCsrfData.csrf_token,
              "X-Job-Token": pending.token,
            },
          })
          if (claimResponse.ok) {
            sessionStorage.removeItem(pendingJob.storageKey)
            destination = pendingJob.destination
          }
        } catch {
          // Login remains successful even if an expired anonymous job cannot be claimed.
        }
      }
      router.push(destination)
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível entrar.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium text-foreground">
          Nome de usuário
        </label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Digite seu nome de usuário"
            required
            className="h-11 w-full rounded-lg border border-border bg-secondary/80 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Senha
          </label>
          <a href="#recuperar-senha" className="text-xs text-brand-light hover:text-foreground">
            Esqueci minha senha
          </a>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            required
            className="h-11 w-full rounded-lg border border-border bg-secondary/80 pl-10 pr-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
      {error ? (
        <p className="rounded-lg border border-warning/60 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
          {error}
        </p>
      ) : null}
    </form>
  )
}
