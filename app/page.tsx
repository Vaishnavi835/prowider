import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prowider Mini — Intelligent Lead Distribution',
  description: 'Fair, real-time lead distribution for service providers with round-robin allocation and quota management.',
}

export default function HomePage() {
  return (
    <div className="hero">
      <div style={{ marginBottom: '1rem' }}>
        <span className="badge badge-live" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>
          Real-time System
        </span>
      </div>
      <h1 className="hero-title">
        Prowider Mini<br />Lead Distribution
      </h1>
      <p className="hero-subtitle">
        Intelligent lead routing with fair round-robin allocation, concurrency-safe transactions, and real-time provider dashboards.
      </p>

      <div className="hero-cards">
        <Link href="/request-service" className="hero-card">
          <div className="hero-card-icon">📋</div>
          <div className="hero-card-title">Request Service</div>
          <div className="hero-card-desc">
            Submit a service request as a customer. Your lead will be instantly distributed to 3 matched providers.
          </div>
          <div className="hero-card-cta">Submit a Lead →</div>
        </Link>

        <Link href="/dashboard" className="hero-card">
          <div className="hero-card-icon">📊</div>
          <div className="hero-card-title">Provider Dashboard</div>
          <div className="hero-card-desc">
            Real-time view of all 8 providers — quota usage, assigned leads, and live SSE updates every 3 seconds.
          </div>
          <div className="hero-card-cta">View Dashboard →</div>
        </Link>

        <Link href="/test-tools" className="hero-card">
          <div className="hero-card-icon">🧪</div>
          <div className="hero-card-title">Test Tools</div>
          <div className="hero-card-desc">
            Stress-test the system: webhook idempotency, 10 concurrent leads, quota resets, and allocation verification.
          </div>
          <div className="hero-card-cta">Open Test Panel →</div>
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        maxWidth: '700px',
        margin: '3rem auto 0',
      }}>
        {[
          { label: 'Services', value: '3' },
          { label: 'Providers', value: '8' },
          { label: 'Monthly Quota', value: '10' },
          { label: 'Per Lead', value: '3 providers' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem 1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
