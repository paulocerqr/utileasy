import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Utility Dev — Utilidades do dia a dia em um só lugar',
  description:
    'Uma coleção de ferramentas para arquivos, mídia e produtividade, além de utilitários feitos especialmente para desenvolvedores.',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
