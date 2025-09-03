import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TK Events',
  description: 'School events calendar for Te Kura o Take Karara - subscribe to stay updated with all school events',
  keywords: 'school events, calendar, newsletter, ical, feed, Te Kura o Take Karara',
  manifest: '/manifest.json',
  themeColor: '#7c3aed',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TK Events'
  }
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
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TK Events" />
        <link rel="apple-touch-icon" href="/favicon-calendar.svg" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
