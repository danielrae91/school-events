import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TK Dates',
  description: 'Stay updated with TK school events and activities',
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
        <meta name="apple-mobile-web-app-title" content="TK Dates" />
        <meta name="theme-color" content="#7c3aed" />
        <link rel="apple-touch-icon" href="/favicon-calendar.svg" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
