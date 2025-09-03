import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TK Events Admin',
  description: 'Admin panel for TK Events - Te Kura o Take Karara',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
