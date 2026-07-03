import { ConstellationCanvas } from "@/components/constellation-canvas"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import {
  FileToolsSection,
  MediaSection,
  ProductivitySection,
} from "@/components/tools-sections"
import { DevSection } from "@/components/dev-section"
import { BackendStatus } from "@/components/backend-status"

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-[#08090f]">
      {/* Animated constellation background */}
      <ConstellationCanvas />

      {/* Content layer */}
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <BackendStatus />
        <FileToolsSection />
        <MediaSection />
        <ProductivitySection />
        <DevSection />

        {/* Bottom spacing */}
        <div className="h-20" />
      </div>
    </main>
  )
}
