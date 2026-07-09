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
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden="true" className="home-image-background" />

      <div className="relative z-10">
        <Navbar />
        <Hero />
        <BackendStatus />
        <FileToolsSection />
        <MediaSection />
        <ProductivitySection />
        <DevSection />

        <div className="h-20" />
      </div>
    </main>
  )
}
