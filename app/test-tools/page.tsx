'use client'

import { useState, useEffect } from 'react'

interface BulkResult {
  success: boolean
  leadId?: number
  serviceId?: number
  assignedProviders?: number[]
  error?: string
}

interface BulkResponse {
  total: number
  succeeded: number
  failed: number
  results: BulkResult[]
}

export default function TestToolsPage() {
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [webhookResponse, setWebhookResponse] = useState<string | null>(null)
  const [webhookLoading, setWebhookLoading] = useState(false)

  const [idempotencyResponses, setIdempotencyResponses] = useState<string[]>([])
  const [idempotencyLoading, setIdempotencyLoading] = useState(false)

  const [bulkResponse, setBulkResponse] = useState<BulkResponse | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    const key = 'payment_' + Math.random().toString(36).substring(2, 10).toUpperCase()
    setIdempotencyKey(key)
  }, [])

  // Section 1: Reset All Quotas
  const handleWebhookReset = async () => {
    setWebhookLoading(true)
    setWebhookResponse(null)
    try {
      const res = await fetch('/api/webhook/reset-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey }),
      })
      const data = await res.json()
      setWebhookResponse(JSON.stringify(data, null, 2))
    } catch (e) {
      setWebhookResponse('Network error: ' + e)
    } finally {
      setWebhookLoading(false)
    }
  }

  // Section 2: Idempotency Test (5 calls with same key)
  const handleIdempotencyTest = async () => {
    setIdempotencyLoading(true)
    setIdempotencyResponses([])
    const fixedKey = 'idempotency_test_' + Date.now()
    const responses: string[] = []

    for (let i = 0; i < 5; i++) {
      try {
        const res = await fetch('/api/webhook/reset-quota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idempotencyKey: fixedKey }),
        })
        const data = await res.json()
        responses.push(JSON.stringify(data))
        setIdempotencyResponses([...responses])
      } catch (e) {
        responses.push('Error: ' + e)
        setIdempotencyResponses([...responses])
      }
    }
    setIdempotencyLoading(false)
  }

  // Section 3: Concurrency Test
  const handleBulkLeads = async () => {
    setBulkLoading(true)
    setBulkResponse(null)
    try {
      const res = await fetch('/api/test-tools/bulk-leads', { method: 'POST' })
      const data = await res.json()
      setBulkResponse(data)
    } catch (e) {
      console.error(e)
    } finally {
      setBulkLoading(false)
    }
  }

  const getResponseClass = (response: string) => {
    if (response.includes('reset successfully')) return 'response-success'
    if (response.includes('idempotent') || response.includes('Already processed')) return 'response-warning'
    return 'response-error'
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Test Tools</h1>
        <p className="page-subtitle">Verify system behaviour — webhook idempotency, quota resets, and concurrency safety.</p>
      </div>

      {/* Section 1: Webhook Reset */}
      <div className="test-section">
        <div className="test-section-title">🔁 Webhook: Reset Provider Quotas</div>
        <div className="test-section-desc">
          Simulates a payment gateway confirming subscription renewal. Quota resets <strong>only</strong> via this webhook — not from the normal UI. Uses an idempotency key to prevent double-processing.
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="idempotency-key-input">Idempotency Key</label>
          <input
            id="idempotency-key-input"
            type="text"
            className="form-input"
            value={idempotencyKey}
            onChange={e => setIdempotencyKey(e.target.value)}
            placeholder="payment_XXXXXXXX"
          />
        </div>

        <button
          id="reset-quota-btn"
          className="btn btn-primary"
          onClick={handleWebhookReset}
          disabled={webhookLoading || !idempotencyKey}
        >
          {webhookLoading ? (
            <>
              <Spinner />
              Resetting...
            </>
          ) : '⚡ Reset All Quotas via Webhook'}
        </button>

        {webhookResponse && (
          <div className={`response-box ${getResponseClass(webhookResponse)}`}>
            {webhookResponse}
          </div>
        )}
      </div>

      {/* Section 2: Idempotency Test */}
      <div className="test-section">
        <div className="test-section-title">🔒 Idempotency Safety Test</div>
        <div className="test-section-desc">
          Calls the webhook <strong>5 times with the exact same key</strong>. Only the first call should reset quotas. Calls 2–5 must return &quot;Already processed&quot; — proving the system is idempotent, just like Stripe webhooks.
        </div>

        <button
          id="idempotency-test-btn"
          className="btn btn-secondary"
          onClick={handleIdempotencyTest}
          disabled={idempotencyLoading}
        >
          {idempotencyLoading ? (
            <>
              <Spinner />
              Running 5 calls...
            </>
          ) : '🔄 Call Webhook 5 Times (Same Key)'}
        </button>

        {idempotencyResponses.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {idempotencyResponses.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{
                  minWidth: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: i === 0 ? 'var(--success-bg)' : 'var(--warning-bg)',
                  border: `1px solid ${i === 0 ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  color: i === 0 ? 'var(--success)' : 'var(--warning)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {i + 1}
                </span>
                <div className={`response-box ${getResponseClass(r)}`} style={{ margin: 0, flex: 1, padding: '0.5rem 0.75rem' }}>
                  {r}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Concurrency Test */}
      <div className="test-section">
        <div className="test-section-title">⚡ Concurrency Test: 10 Simultaneous Leads</div>
        <div className="test-section-desc">
          Creates 10 leads at exactly the same time using <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>Promise.all</code>. Tests that <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>SELECT FOR UPDATE</code> prevents race conditions in the allocation engine.
        </div>

        <button
          id="bulk-leads-btn"
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          onClick={handleBulkLeads}
          disabled={bulkLoading}
        >
          {bulkLoading ? (
            <>
              <Spinner />
              Generating 10 leads...
            </>
          ) : '🚀 Generate 10 Simultaneous Leads'}
        </button>

        {bulkResponse && (
          <div style={{ marginTop: '1rem' }}>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <StatChip label="Total" value={bulkResponse.total} color="var(--text-primary)" />
              <StatChip label="Succeeded" value={bulkResponse.succeeded} color="var(--success)" />
              <StatChip label="Failed" value={bulkResponse.failed} color={bulkResponse.failed > 0 ? 'var(--danger)' : 'var(--text-muted)'} />
            </div>

            {/* Results list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '300px', overflowY: 'auto' }}>
              {bulkResponse.results.map((r, i) => (
                <div key={i} style={{
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${r.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ color: r.success ? 'var(--success)' : 'var(--danger)' }}>
                    {r.success ? '✅' : '❌'} Lead #{i + 1}
                    {r.success ? ` · Service ${r.serviceId} · ID ${r.leadId}` : ` · ${r.error}`}
                  </span>
                  {r.success && r.assignedProviders && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Providers: {r.assignedProviders.join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: '14px',
      height: '14px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: 'white',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '0.75rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
