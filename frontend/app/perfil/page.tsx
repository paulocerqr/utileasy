import type { Metadata } from "next"
import { ProfileSettings } from "@/components/profile-settings"

export const metadata: Metadata = {
  title: "Perfil — Utileazy",
  description: "Gerencie suas informações de perfil no Utileazy.",
}

export default function ProfilePage() {
  return (
    <main className="relative min-h-screen bg-background">
      <div aria-hidden="true" className="login-image-background" />
      <div className="relative z-10">
        <ProfileSettings />
      </div>
    </main>
  )
}
