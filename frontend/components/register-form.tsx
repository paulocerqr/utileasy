"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react"

export function RegisterForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const form = new FormData(event.currentTarget)
    const password = String(form.get("password") || "")
    const passwordConfirmation = String(form.get("password_confirmation") || "")
    if (password !== passwordConfirmation) {
      setError("As senhas não coincidem.")
      return
    }

    setIsSubmitting(true)
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" })
      const csrfData = await csrfResponse.json()
      if (!csrfResponse.ok) throw new Error("Não foi possível iniciar o cadastro.")

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfData.csrf_token,
        },
        body: JSON.stringify({
          username: form.get("username"),
          email: form.get("email"),
          password,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.detail || "Não foi possível criar sua conta.")
      }

      router.push("/transcrisao")
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível criar sua conta."
      )
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
            placeholder="Escolha um nome de usuário"
            required
            minLength={3}
            className="h-11 w-full rounded-lg border border-border bg-secondary/80 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mail
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
            className="h-11 w-full rounded-lg border border-border bg-secondary/80 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Senha
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Crie uma senha"
            required
            minLength={8}
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

      <div className="space-y-2">
        <label htmlFor="password_confirmation" className="text-sm font-medium text-foreground">
          Confirmar senha
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password_confirmation"
            name="password_confirmation"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repita sua senha"
            required
            minLength={8}
            className="h-11 w-full rounded-lg border border-border bg-secondary/80 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Criando conta..." : "Criar conta"}
      </button>
      {error ? (
        <p className="rounded-lg border border-warning/60 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
          {error}
        </p>
      ) : null}
    </form>
  )
}
