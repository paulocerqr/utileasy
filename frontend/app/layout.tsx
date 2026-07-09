import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Utility Dev - Utilidades do dia a dia em um so lugar',
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
      <body>{children}</body>
    </html>
  )
}
