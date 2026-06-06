'use client'

import { ExtractionJob } from '@/lib/supabase/client'

interface ProgressTrackerProps {
  job: ExtractionJob | null
}

export function ProgressTracker({ job }: ProgressTrackerProps) {
  if (!job) return null

  const pct = job.total_pages > 0
    ? Math.round((job.processed_pages / job.total_pages) * 100)
    : 0

  const statusConfig = {
    pending:  { label: 'Queued',      color: 'var(--color-text-muted)', icon: '⏳' },
    running:  { label: 'Extracting',  color: 'var(--color-accent)',     icon: '⚡' },
    done:     { label: 'Complete',    color: 'var(--color-success)',    icon: '✅' },
    error:    { label: 'Error',       color: 'var(--color-error)',      icon: '❌' },
  }

  const config = statusConfig[job.status] ?? statusConfig.pending

  return (
    <div className="card animate-fade-in" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text-primary)' }}>
            {config.icon} Extraction {config.label}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {job.assembly_name} — Part {job.part_no}
          </p>
        </div>

        <div style={{
          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: job.status === 'done' ? 'var(--color-success-bg)'
            : job.status === 'error' ? 'var(--color-error-bg)'
            : 'rgba(59,130,246,0.12)',
          color: config.color,
          border: `1px solid ${config.color}44`,
        }}>
          {config.label.toUpperCase()}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatBox label="Pages Processed" value={`${job.processed_pages} / ${job.total_pages}`} />
        <StatBox label="Voters Found" value={job.total_voters.toLocaleString()} highlight />
        <StatBox label="Progress" value={`${pct}%`} />
      </div>

      {/* Progress bar */}
      {job.status !== 'error' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {job.status === 'running' ? 'Processing pages with Gemini Vision AI...' : 'Complete'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-accent-text)', fontWeight: 600 }}>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {job.status === 'error' && job.error_message && (
        <div style={{
          marginTop: 12, padding: '12px 16px', borderRadius: 8,
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          border: '1px solid rgba(239,68,68,0.3)',
          fontSize: 13,
        }}>
          <strong>Error:</strong> {job.error_message}
        </div>
      )}

      {/* Done summary */}
      {job.status === 'done' && (
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 8,
          background: 'var(--color-success-bg)',
          color: 'var(--color-success)',
          border: '1px solid rgba(34,197,94,0.3)',
          fontSize: 14, fontWeight: 600,
        }}>
          🎉 Successfully indexed {job.total_voters.toLocaleString()} voters across {job.total_pages} pages!
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 10,
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 22, fontWeight: 800,
        color: highlight ? 'var(--color-accent-text)' : 'var(--color-text-primary)',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
    </div>
  )
}
