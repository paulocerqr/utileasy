"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          action?: string
          callback: (token: string) => void
          "expired-callback": () => void
          "error-callback": () => void
          theme?: "auto" | "light" | "dark"
        },
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  siteKey: string
  onToken: (token: string) => void
  action?: string
}

export function TurnstileWidget({
  siteKey,
  onToken,
  action = "anonymous_transcription",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let widgetId = ""
    let cancelled = false

    const renderWidget = () => {
      if (cancelled || widgetId || !containerRef.current || !window.turnstile) return
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "auto",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      })
    }

    const existingScript = document.getElementById("cloudflare-turnstile") as HTMLScriptElement | null
    if (window.turnstile) {
      renderWidget()
    } else if (existingScript) {
      existingScript.addEventListener("load", renderWidget)
    } else {
      const script = document.createElement("script")
      script.id = "cloudflare-turnstile"
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      script.async = true
      script.defer = true
      script.addEventListener("load", renderWidget)
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      existingScript?.removeEventListener("load", renderWidget)
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [action, onToken, siteKey])

  return <div ref={containerRef} className="flex min-h-16 justify-center" />
}
