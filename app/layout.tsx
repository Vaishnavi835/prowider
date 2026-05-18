import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Prowider Mini — Lead Distribution System',
  description: 'Intelligent lead distribution platform with real-time provider dashboards and fair round-robin allocation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="navbar">
          <div className="navbar-inner">
            <Link href="/" className="navbar-brand">
              <span className="brand-icon">⚡</span>
              <span>Prowider <span className="brand-mini">Mini</span></span>
            </Link>
            <div className="navbar-links">
              <Link href="/request-service" className="nav-link">
                <span className="nav-icon">📋</span>
                Request Service
              </Link>
              <Link href="/dashboard" className="nav-link">
                <span className="nav-icon">📊</span>
                Dashboard
              </Link>
              <Link href="/test-tools" className="nav-link nav-link-accent">
                <span className="nav-icon">🧪</span>
                Test Tools
              </Link>
            </div>
          </div>
        </nav>
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  )
}
