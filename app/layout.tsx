import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kå heit båten - AIS Tromsøysundet',
  description: 'Sanntids AIS-visning av fartøy i Tromsøysundet',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  )
}
