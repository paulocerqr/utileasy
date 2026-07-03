import type { LucideIcon } from "lucide-react"

interface SectionHeaderProps {
  icon: LucideIcon
  title: string
  iconColor?: string
  iconBg?: string
}

export function SectionHeader({
  icon: Icon,
  title,
  iconColor = "text-[#aaaaaa]",
  iconBg = "bg-[#1a1a1a]",
}: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-md ${iconBg}`}
      >
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
    </div>
  )
}
