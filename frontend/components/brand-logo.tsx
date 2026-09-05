import Image from "next/image"

export function BrandLogo() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5">
      <Image
        src="/logo/utileazy-icon.svg"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0"
      />
      <span className="font-mono text-xl font-extrabold tracking-tight text-foreground">
        Utileazy
      </span>
    </span>
  )
}
