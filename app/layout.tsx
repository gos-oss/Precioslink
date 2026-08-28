import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Precioslink',
  description: 'Sistema de gestión de pricing, inventario y reportes inmobiliarios para proyectos de inversión',
  openGraph: {
    title: 'Precioslink',
    description: 'Sistema de gestión de pricing, inventario y reportes inmobiliarios para proyectos de inversión',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
