'use client'

import { useState } from 'react'
import type { Metadata } from 'next'

export default function RequestServicePage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    serviceId: '1',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, serviceId: Number(form.serviceId) }),
      })
      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: `✅ Your service request has been submitted! Lead #${data.leadId} assigned to ${data.assignedProviders?.length || 3} providers.` })
        setForm({ name: '', phone: '', city: '', serviceId: '1', description: '' })
      } else if (res.status === 409) {
        setMessage({ type: 'error', text: '❌ You have already submitted a lead for this service.' })
      } else {
        setMessage({ type: 'error', text: '❌ Something went wrong. Please try again.' })
      }
    } catch {
      setMessage({ type: 'error', text: '❌ Network error. Please check your connection.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Request a Service</h1>
        <p className="page-subtitle">Fill in your details and we&apos;ll match you with the best providers instantly.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              placeholder="e.g. Priya Sharma"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="text"
              className="form-input"
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="city">City</label>
            <input
              id="city"
              name="city"
              type="text"
              className="form-input"
              placeholder="e.g. Mumbai"
              value={form.city}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="serviceId">Service Type</label>
            <select
              id="serviceId"
              name="serviceId"
              className="form-select"
              value={form.serviceId}
              onChange={handleChange}
              required
            >
              <option value="1">Service 1</option>
              <option value="2">Service 2</option>
              <option value="3">Service 3</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="Describe your service requirement..."
              value={form.description}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            id="submit-lead-btn"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Submitting...
              </>
            ) : 'Submit Request →'}
          </button>

          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>

      {/* Info box */}
      <div style={{
        marginTop: '1.5rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>How it works</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Your lead is automatically assigned to <strong style={{ color: 'var(--text-primary)' }}>exactly 3 providers</strong> — one mandatory specialist and two from a fair rotation pool. Check the <a href="/dashboard" style={{ color: 'var(--accent)' }}>dashboard</a> to see assignments in real-time.
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
