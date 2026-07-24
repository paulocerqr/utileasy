"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  FilePlus2,
  FileText,
  Film,
  Gauge,
  ImageIcon,
  ListOrdered,
  Mic,
  QrCode,
  Shuffle,
  Users,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

interface Feature {
  id: string
  category: string
  label: string
  icon: LucideIcon
  image: string
  description: string
  href: string
  actionLabel: string
}

type FeatureDefinition = readonly [
  id: string,
  label: string,
  icon: LucideIcon,
  description: string,
  href?: string,
  actionLabel?: string,
]

function createFeatures(
  category: string,
  image: string,
  defaultHref: string,
  definitions: readonly FeatureDefinition[],
): Feature[] {
  return definitions.map(
    ([id, label, icon, description, href, actionLabel]) => ({
      id,
      category,
      label,
      icon,
      image,
      description,
      href: href ?? defaultHref,
      actionLabel: actionLabel ?? "Ver na seção",
    }),
  )
}

const FEATURES: Feature[] = [
  ...createFeatures(
    "Arquivos",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1200&auto=format&fit=crop",
    "#ferramentas",
    [
      [
        "pdf-docx",
        "Conversão PDF para DOCX",
        FileText,
        "Converta documentos entre PDF e Word mantendo a formatação original.",
        "/pdf-docx",
        "Abrir ferramenta",
      ],
      [
        "organizar-pdfs",
        "Juntar PDFs",
        FilePlus2,
        "Combine vários arquivos PDF em um único documento.",
        "/juntarpdf",
        "Abrir ferramenta",
      ],
      [
        "imagens-pdf",
        "Imagens para PDF",
        ImageIcon,
        "Transforme fotos e capturas de tela em um documento PDF organizado.",
      ],
    ],
  ),
  ...createFeatures(
    "Mídia e vídeo",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1200&auto=format&fit=crop",
    "#ferramentas",
    [
      [
        "youtube",
        "Baixar vídeos do YouTube",
        Film,
        "Baixe vídeos autorizados para uso pessoal e offline.",
      ],
      [
        "transcricao",
        "Transcrição de áudio e vídeo",
        Mic,
        "Envie arquivos e gere transcrições automáticas com boa precisão.",
        "/transcrisao",
        "Abrir ferramenta",
      ],
    ],
  ),
  ...createFeatures(
    "Produtividade",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop",
    "#produtividade",
    [
      [
        "sorteador",
        "Sorteador",
        Shuffle,
        "Sorteie números ou itens de uma lista sem repetições.",
        "/sorteador",
        "Abrir ferramenta",
      ],
      [
        "ordem-apresentacao",
        "Ordem de apresentação",
        ListOrdered,
        "Organize a ordem de apresentações em equipe rapidamente.",
        "/ordem-de-apresentacao",
        "Abrir ferramenta",
      ],
      [
        "divisor-grupos",
        "Divisor de grupos",
        Users,
        "Separe pessoas em equipes equilibradas em poucos cliques.",
        "/divisor-de-grupos",
        "Abrir ferramenta",
      ],
      [
        "qr-code",
        "Gerador de QR Code",
        QrCode,
        "Crie QR codes para links e acesso a redes Wi-Fi.",
        "/qr-code",
        "Abrir ferramenta",
      ],
    ],
  ),
  ...createFeatures(
    "Para desenvolvedores",
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop",
    "#devs",
    [
      [
        "velocidade",
        "Teste de velocidade",
        Gauge,
        "Verifique a latência e a velocidade da sua conexão.",
      ],
    ],
  ),
]

const AUTO_PLAY_INTERVAL = 4500
const ITEM_HEIGHT = 65

function wrap(min: number, max: number, value: number) {
  const rangeSize = max - min
  return ((((value - min) % rangeSize) + rangeSize) % rangeSize) + min
}

export function FeatureCarousel() {
  const [step, setStep] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const currentIndex = wrap(0, FEATURES.length, step)
  const activeFeature = FEATURES[currentIndex]

  const goToNext = useCallback(() => {
    setStep((currentStep) => currentStep + 1)
  }, [])

  const goToPrevious = useCallback(() => {
    setStep((currentStep) => currentStep - 1)
  }, [])

  const goToFeature = (index: number) => {
    let distance = index - currentIndex

    if (distance > FEATURES.length / 2) distance -= FEATURES.length
    if (distance < -FEATURES.length / 2) distance += FEATURES.length

    setStep((currentStep) => currentStep + distance)
  }

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return

    const interval = window.setInterval(goToNext, AUTO_PLAY_INTERVAL)
    return () => window.clearInterval(interval)
  }, [goToNext, isPaused, prefersReducedMotion])

  const getCardStatus = (index: number) => {
    let distance = index - currentIndex

    if (distance > FEATURES.length / 2) distance -= FEATURES.length
    if (distance < -FEATURES.length / 2) distance += FEATURES.length

    if (distance === 0) return "active"
    if (distance === -1) return "previous"
    if (distance === 1) return "next"
    return "hidden"
  }

  return (
    <section
      aria-labelledby="feature-carousel-title"
      className="relative z-10 mx-auto max-w-7xl px-6 py-10"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-light">
            Explore o Utileazy
          </p>
          <h2
            id="feature-carousel-title"
            className="mt-2 text-2xl font-bold text-foreground md:text-3xl"
          >
            Uma ferramenta para cada tarefa
          </h2>
        </div>
      </div>

      <div
        className="relative flex min-h-[780px] w-full flex-col overflow-hidden rounded-[2rem] border border-border bg-transparent shadow-2xl lg:min-h-[600px] lg:flex-row lg:rounded-[3rem]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault()
          }
          if (event.key === "ArrowLeft") goToPrevious()
          if (event.key === "ArrowRight") goToNext()
        }}
      >
        <span
          id="feature-carousel"
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-1/2 scroll-mt-[50vh]"
        />

        <div className="relative z-30 flex min-h-[330px] w-full items-center justify-center overflow-hidden bg-transparent px-6 backdrop-blur-xl md:min-h-[380px] md:px-12 lg:min-h-0 lg:w-[42%] lg:justify-start lg:px-14">
          <div className="absolute inset-x-0 top-0 z-40 h-16 bg-gradient-to-b from-background/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-40 h-16 bg-gradient-to-t from-background/35 to-transparent" />

          <div className="relative z-20 flex h-full w-full items-center justify-center lg:justify-start">
            {FEATURES.map((feature, index) => {
              const isActive = index === currentIndex
              const wrappedDistance = wrap(
                -(FEATURES.length / 2),
                FEATURES.length / 2,
                index - currentIndex,
              )
              const isVisible = Math.abs(wrappedDistance) <= 3
              const Icon = feature.icon

              return (
                <motion.div
                  key={feature.id}
                  animate={{
                    y: wrappedDistance * ITEM_HEIGHT,
                    opacity: Math.max(0, 1 - Math.abs(wrappedDistance) * 0.28),
                    scale: isActive ? 1 : 0.96,
                  }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 90, damping: 22, mass: 1 }
                  }
                  className="absolute flex items-center justify-start"
                  style={{
                    height: ITEM_HEIGHT,
                    pointerEvents: isVisible ? "auto" : "none",
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Exibir ${feature.label}`}
                    aria-pressed={isActive}
                    tabIndex={isVisible ? 0 : -1}
                    onClick={() => goToFeature(index)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-full border px-5 py-3 text-left transition-colors duration-500 md:px-7 md:py-4",
                      isActive
                        ? "z-10 border-card bg-card text-foreground shadow-lg"
                        : "border-border/50 bg-transparent text-foreground/70 hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors duration-500",
                        isActive
                          ? "text-brand-light"
                          : "text-foreground/60",
                      )}
                    />
                    <span className="whitespace-nowrap text-xs font-medium uppercase tracking-tight md:text-sm">
                      {feature.label}
                    </span>
                  </button>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="relative flex min-h-[450px] flex-1 items-center justify-center overflow-hidden border-t border-border bg-secondary/50 px-6 py-14 md:min-h-[520px] md:px-12 lg:min-h-0 lg:border-l lg:border-t-0 lg:px-10 lg:py-16">
          <div className="relative flex aspect-[4/5] w-full max-w-[390px] items-center justify-center">
            {FEATURES.map((feature, index) => {
              const status = getCardStatus(index)
              const isActive = status === "active"
              const isPrevious = status === "previous"
              const isNext = status === "next"
              const Icon = feature.icon

              return (
                <motion.article
                  key={feature.id}
                  aria-hidden={!isActive}
                  animate={{
                    x: isActive ? 0 : isPrevious ? -76 : isNext ? 76 : 0,
                    scale: isActive ? 1 : isPrevious || isNext ? 0.88 : 0.76,
                    opacity: isActive ? 1 : isPrevious || isNext ? 0.35 : 0,
                    rotate: isPrevious ? -3 : isNext ? 3 : 0,
                    zIndex: isActive ? 20 : isPrevious || isNext ? 10 : 0,
                  }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 240,
                          damping: 26,
                          mass: 0.8,
                        }
                  }
                  className="absolute inset-0 origin-center overflow-hidden rounded-[2rem] border-4 border-card bg-card shadow-2xl md:rounded-[2.5rem] md:border-8"
                  style={{ pointerEvents: isActive ? "auto" : "none" }}
                >
                  <img
                    src={feature.image}
                    alt={`Ilustração de ${feature.label}`}
                    loading={isActive ? "eager" : "lazy"}
                    className={cn(
                      "h-full w-full object-cover transition-[filter] duration-700",
                      isActive
                        ? "grayscale-0 blur-0"
                        : "grayscale brightness-75 blur-[2px]",
                    )}
                  />

                  <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent p-6 pb-16">
                    <span className="rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                      {feature.category}
                    </span>
                    <span className="font-mono text-xs text-white/80">
                      {String(index + 1).padStart(2, "0")} / {FEATURES.length}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.div
                        key={feature.id}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/70 to-transparent p-7 pt-32 md:p-9 md:pt-36"
                      >
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm">
                          <Icon aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <h3 className="text-xl font-semibold leading-tight text-white md:text-2xl">
                          {feature.label}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/75 md:text-base">
                          {feature.description}
                        </p>
                        <Link
                          href={feature.href}
                          tabIndex={isActive ? 0 : -1}
                          className="mt-5 flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                        >
                          {feature.actionLabel}
                          <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              )
            })}
          </div>

          <div className="absolute inset-x-0 bottom-4 z-30 flex items-center justify-center gap-3 md:bottom-6">
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Exibir ferramenta anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-accent"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span
              aria-live="polite"
              className="min-w-28 text-center text-xs font-medium text-muted-foreground"
            >
              {currentIndex + 1} de {FEATURES.length}
              <span className="sr-only">: {activeFeature.label}</span>
            </span>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Exibir próxima ferramenta"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-accent"
            >
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeatureCarousel
