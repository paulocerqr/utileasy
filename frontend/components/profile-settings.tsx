"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Trash2, X } from "lucide-react"

interface ProfileData {
  id: number
  username: string
  email: string
  first_name: string
  bio: string
  avatar_url: string | null
}

export function ProfileSettings() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Editable fields
  const [firstName, setFirstName] = useState("")
  const [bio, setBio] = useState("")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    let active = true
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 403 || response.status === 401) {
            router.push("/login")
            return null
          }
          throw new Error("Não foi possível carregar o perfil.")
        }
        return response.json()
      })
      .then((data: ProfileData | null) => {
        if (!active || !data) return
        setProfile(data)
        setFirstName(data.first_name ?? "")
        setBio(data.bio ?? "")
        setAvatarPreview(data.avatar_url ?? null)
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Erro desconhecido.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [router])

  async function getCsrf(): Promise<string> {
    const response = await fetch("/api/auth/csrf", { cache: "no-store" })
    const data = await response.json()
    if (!response.ok || !data?.csrf_token) throw new Error("Não foi possível obter CSRF.")
    return data.csrf_token
  }

  function handleFieldChange(setter: (value: string) => void) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(event.target.value)
      setDirty(true)
      setSaveMessage("")
    }
  }

  function handleDiscard() {
    if (!profile) return
    setFirstName(profile.first_name ?? "")
    setBio(profile.bio ?? "")
    setDirty(false)
    setSaveMessage("")
  }

  async function handleSave() {
    setSaving(true)
    setSaveMessage("")
    try {
      const csrfToken = await getCsrf()
      const response = await fetch("/api/auth/me/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ first_name: firstName, bio }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || "Não foi possível salvar.")
      setProfile(data)
      setFirstName(data.first_name ?? "")
      setBio(data.bio ?? "")
      setDirty(false)
      setSaveMessage("Salvo com sucesso.")
    } catch (requestError) {
      setSaveMessage(requestError instanceof Error ? requestError.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setSaveMessage("A imagem deve ter no máximo 2 MB.")
      return
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      setSaveMessage("Formato aceito: JPEG, PNG ou WebP.")
      return
    }

    setAvatarUploading(true)
    setSaveMessage("")
    try {
      const csrfToken = await getCsrf()
      const formData = new FormData()
      formData.append("avatar", file)
      const response = await fetch("/api/auth/me/avatar/", {
        method: "POST",
        headers: { "X-CSRFToken": csrfToken },
        body: formData,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || "Não foi possível enviar a foto.")
      setProfile(data)
      setAvatarPreview(data.avatar_url ?? null)
      setSaveMessage("Foto atualizada.")
    } catch (requestError) {
      setSaveMessage(requestError instanceof Error ? requestError.message : "Erro ao enviar foto.")
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleAvatarRemove() {
    setAvatarUploading(true)
    setSaveMessage("")
    try {
      const csrfToken = await getCsrf()
      const response = await fetch("/api/auth/me/avatar/", {
        method: "DELETE",
        headers: { "X-CSRFToken": csrfToken },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.detail || "Não foi possível remover a foto.")
      }
      setAvatarPreview(null)
      if (profile) setProfile({ ...profile, avatar_url: null })
      setSaveMessage("Foto removida.")
    } catch (requestError) {
      setSaveMessage(requestError instanceof Error ? requestError.message : "Erro ao remover foto.")
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword.trim()) {
      setDeleteError("Digite sua senha para confirmar.")
      return
    }
    setDeleting(true)
    setDeleteError("")
    try {
      const csrfToken = await getCsrf()
      const response = await fetch("/api/auth/me/delete/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ password: deletePassword }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.detail || data?.password?.[0] || "Não foi possível excluir a conta.")
      }
      router.push("/login")
      router.refresh()
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : "Erro ao excluir conta.")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando perfil…</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-warning-foreground">{error || "Não foi possível carregar o perfil."}</p>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 py-12 pb-32 sm:px-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Conta · Perfil
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Seu perfil</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Como você aparece no Utileazy.
        </p>

        {/* Photo */}
        <Section title="Foto">
          <div className="flex items-center gap-5">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-light/40 to-brand-light/10 ring-1 ring-border">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="size-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <Camera className="size-3.5" />
                  {avatarUploading ? "Enviando…" : "Enviar"}
                </button>
                {avatarPreview ? (
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={handleAvatarRemove}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                  >
                    Remover
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Recomendado: 400×400 em PNG, JPG ou WebP. Máx. 2 MB.
              </p>
            </div>
          </div>
        </Section>

        <hr className="my-8 border-border" />

        {/* Identity */}
        <Section title="Identidade">
          <Field label="Nome de exibição" htmlFor="p-name">
            <input
              id="p-name"
              type="text"
              value={firstName}
              onChange={handleFieldChange(setFirstName)}
              maxLength={150}
              className="h-9 w-full rounded-lg border border-border bg-secondary/80 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </Field>
          <Field label="Bio" htmlFor="p-bio" hint="Até 240 caracteres.">
            <textarea
              id="p-bio"
              rows={3}
              value={bio}
              onChange={handleFieldChange(setBio)}
              maxLength={240}
              placeholder="Designer, engenheiro, geralmente em ambientes fechados."
              className="w-full rounded-lg border border-border bg-secondary/80 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25 resize-none"
            />
          </Field>
          <Field label="Email" htmlFor="p-email">
            <input
              id="p-email"
              type="email"
              value={profile.email}
              readOnly
              className="h-9 w-full cursor-not-allowed rounded-lg border border-border bg-secondary/40 px-3 text-sm text-muted-foreground outline-none"
            />
          </Field>
        </Section>

        <hr className="my-8 border-border" />

        {/* Delete account */}
        <Section title="Conta">
          <div className="flex items-center gap-4 rounded-lg border border-warning/40 bg-warning/[0.03] p-3.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
              <Trash2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Excluir conta</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Remover permanentemente sua conta e dados pessoais.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowDeleteModal(true); setDeletePassword(""); setDeleteError("") }}
              className="shrink-0 rounded-lg border border-warning/40 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/10"
            >
              Excluir
            </button>
          </div>
        </Section>
      </div>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3 sm:px-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {saveMessage ? saveMessage : dirty ? "Alterações não salvas" : "Tudo salvo"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={handleDiscard}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              Descartar
            </button>
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={handleSave}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setShowDeleteModal(false)}
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Excluir conta</h2>
                <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Sua conta será desativada e você perderá acesso ao Utileazy.
              Digite sua senha para confirmar.
            </p>

            <div className="mt-4 flex flex-col gap-1.5">
              <label htmlFor="delete-pw" className="text-sm font-medium">
                Senha
              </label>
              <input
                id="delete-pw"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(event) => { setDeletePassword(event.target.value); setDeleteError("") }}
                className="h-9 w-full rounded-lg border border-border bg-secondary/80 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            </div>

            {deleteError ? (
              <p className="mt-3 rounded-lg border border-warning/60 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                {deleteError}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting || !deletePassword.trim()}
                onClick={handleDeleteAccount}
                className="rounded-lg bg-warning/10 px-4 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning/20 disabled:opacity-50"
              >
                {deleting ? "Excluindo…" : "Excluir minha conta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
