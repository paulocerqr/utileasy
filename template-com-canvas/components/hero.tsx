export function Hero() {
  return (
    <section className="relative z-10 flex flex-col items-center justify-center px-6 pb-20 pt-24 text-center">
      <h1 className="max-w-3xl text-balance text-5xl font-bold leading-tight text-foreground md:text-6xl">
        Utilidades do dia a dia em{" "}
        <span className="text-white">um só lugar</span>
      </h1>
      <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
        Uma coleção de ferramentas para arquivos, mídia e produtividade, além de
        utilitários feitos especialmente para desenvolvedores.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a
          href="#ferramentas"
          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-90"
        >
          Explorar ferramentas
        </a>
        <a
          href="#devs"
          className="rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/10"
        >
          Ver ferramentas para Devs
        </a>
      </div>
    </section>
  )
}
