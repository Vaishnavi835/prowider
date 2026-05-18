'use client'

import { useEffect, useState } from 'react'

interface Lead {
  name: string
  phone: string
  city: string
  description: string
  service: { name: string }
}

interface Assignment {
  id: number
  assignedAt: string
  lead: Lead
}

interface Provider {
  id: number
  name: string
  monthlyQuota: number
  leadsReceivedCount: number
  assignments: Assignment[]
}

function getQuotaColor(used: number, quota: number) {
  const pct = used / quota
  if (pct >= 1) return { header: '#ef444420', accent: 'var(--danger)', bar: 'progress-red' }
  if (pct >= 0.7) return { header: '#f59e0b20', accent: 'var(--warning)', bar: 'progress-yellow' }
  return { header: '#22c55e15', accent: 'var(--success)', bar: 'progress-green' }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ProviderCard({ provider }: { provider: Provider }) {
  const colors = getQuotaColor(provider.leadsReceivedCount, provider.monthlyQuota)
  const pct = Math.min(100, (provider.leadsReceivedCount / provider.monthlyQuota) * 100)
  const remaining = provider.monthlyQuota - provider.leadsReceivedCount

  return (
    <div className="provider-card">
      <div className="provider-card-header" style={{ background: colors.header }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="provider-name">{provider.name}</div>
            <div className="provider-quota">
              {provider.leadsReceivedCount} / {provider.monthlyQuota} leads used
            </div>
          </div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: colors.accent,
            background: `${colors.accent}20`,
            padding: '0.2rem 0.5rem',
            borderRadius: '100px',
          }}>
            {remaining} left
          </div>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${colors.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="provider-card-body">
        {provider.assignments.length === 0 ? (
          <div className="no-leads">No leads assigned yet</div>
        ) : (
          provider.assignments.map(a => (
            <div key={a.id} className="lead-item">
              <div className="lead-customer">{a.lead.name}</div>
              <div className="lead-meta">
                {a.lead.service.name} · {a.lead.city}
              </div>
              <div className="lead-meta" style={{ marginTop: '0.1rem' }}>
                {formatDate(a.assignedAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="provider-card">
      <div className="provider-card-header">
        <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '6px' }} />
        <div className="skeleton" style={{ height: '12px', width: '80%' }} />
        <div className="skeleton" style={{ height: '6px', marginTop: '10px', borderRadius: '100px' }} />
      </div>
      <div className="provider-card-body">
        {[1, 2].map(i => (
          <div key={i} className="lead-item">
            <div className="skeleton" style={{ height: '13px', width: '70%', marginBottom: '5px' }} />
            <div className="skeleton" style={{ height: '11px', width: '50%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const es = new EventSource('/api/dashboard/stream')

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setProviders(data)
      setLoading(false)
      setConnected(true)
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
    }

    return () => es.close()
  }, [])

  const totalLeads = providers.reduce((sum, p) => sum + p.leadsReceivedCount, 0)
  const fullProviders = providers.filter(p => p.leadsReceivedCount >= p.monthlyQuota).length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Provider Dashboard</h1>
          <p className="page-subtitle">Real-time view of lead distribution across all 8 providers</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={`badge ${connected ? 'badge-live' : ''}`} style={!connected ? { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600 } : { padding: '0.3rem 0.8rem' }}>
            {connected ? 'Live' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem', maxWidth: '500px' }}>
          {[
            { label: 'Total Leads', value: totalLeads },
            { label: 'Active Providers', value: providers.length - fullProviders },
            { label: 'Full Quota', value: fullProviders },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Provider grid */}
      <div className="provider-grid">
        {loading
          ? Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)
          : providers.map(p => <ProviderCard key={p.id} provider={p} />)
        }
      </div>
    </div>
  )
}
