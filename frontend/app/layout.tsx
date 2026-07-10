import type { Metadata, Viewport } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

const themeScript = `
  try {
    const storedTheme = localStorage.getItem('theme')
    const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    document.documentElement.dataset.theme = storedTheme || preferredTheme
  } catch {
    document.documentElement.dataset.theme = 'dark'
  }
`

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
    <html lang="pt-BR" className="bg-background" suppressHydrationWarning>
      <body className={geistMono.className}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  )
}
