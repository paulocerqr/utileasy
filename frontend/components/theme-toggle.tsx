"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "dark" | "light"

function getDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark"
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem("theme", theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(getDocumentTheme())
  }, [])

  const currentTheme = theme ?? "dark"
  const nextTheme = currentTheme === "light" ? "dark" : "light"

  return (
    <button
      type="button"
      aria-label={`Ativar modo ${nextTheme === "light" ? "claro" : "escuro"}`}
      title={`Ativar modo ${nextTheme === "light" ? "claro" : "escuro"}`}
      onClick={() => {
        applyTheme(nextTheme)
        setTheme(nextTheme)
      }}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {currentTheme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  )
}
