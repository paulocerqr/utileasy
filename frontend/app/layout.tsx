import type { Metadata, Viewport } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Utileazy - Utilidades do dia a dia em um so lugar',
  description:
    'Uma colecao de ferramentas para arquivos, midia e produtividade, alem de utilitarios feitos especialmente para desenvolvedores.',
}

export const viewport: Viewport = {
  themeColor: '#1f1f1f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={geistMono.className}>{children}</body>
    </html>
  )
}
