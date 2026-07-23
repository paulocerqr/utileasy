import { FeatureCarousel } from "@/components/ui/feature-carousel"
import { Hero } from "@/components/hero"
import { DevSection } from "@/components/dev-section"
import { BackendStatus } from "@/components/backend-status"

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden="true" className="home-image-background" />

      <div className="relative z-10">
        <Hero />
        <FeatureCarousel />
        <DevSection />

        <div className="h-20" />
        <BackendStatus />
      </div>
    </main>
  )
}
