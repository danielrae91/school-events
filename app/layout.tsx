import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TK Events',
  description: 'Stay updated with the latest events at Te Kura',
  keywords: 'school events, calendar, newsletter, ical, feed, Te Kura o Take Karara',
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon-calendar.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon-calendar.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TK Events" />
        <meta name="theme-color" content="#7c3aed" />
        <link rel="apple-touch-icon" href="/favicon-calendar.svg" />
      </head>
      <body className={inter.className}>
        <ChunkErrorBoundary>
          {children}
          <Toaster />
        </ChunkErrorBoundary>
      </body>
    </html>
  )
}
