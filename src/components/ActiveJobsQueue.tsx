'use client'

import { useEffect, useState } from 'react'
import { ExtractionJob } from '@/lib/supabase/client'

export function ActiveJobsQueue() {
  const [jobs, setJobs] = useState<ExtractionJob[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      if (data.jobs) {
        setJobs(data.jobs)
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Poll every 3 seconds
  useEffect(() => {
    fetchJobs()
    const int = setInterval(fetchJobs, 3000)
    return () => clearInterval(int)
  }, [])

  const activeCount = jobs.filter(j => j.status === 'running' || j.status === 'pending').length

  if (isLoading) {
    return <div style={{ opacity: 0.5 }}>Loading queue...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', paddingBottom: 12 }}>
        <span style={{ color: '#94a3b8' }}>Extraction Queue</span>
        <span style={{ color: activeCount > 0 ? '#34d399' : '#e2e8f0', fontWeight: 600 }}>
          {activeCount} Active Jobs
        </span>
      </div>

      {jobs.length === 0 ? (
        <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
          No recent extractions.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
          {jobs.map(job => (
            <div key={job.id} style={{ 
              background: 'rgba(30, 41, 59, 0.4)', 
              borderRadius: 8, 
              padding: 12,
              border: '1px solid rgba(51, 65, 85, 0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                  {job.assembly_name} - Part {job.part_no}
                </span>
                <StatusBadge status={job.status} />
              </div>

              {job.status === 'running' && job.total_pages > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                    <span>Progress</span>
                    <span>{job.processed_pages} / {job.total_pages} pages</span>
                  </div>
                  <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.round((job.processed_pages / job.total_pages) * 100)}%`, 
                      height: '100%', 
                      background: '#3b82f6',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}

              {job.status === 'done' && (
                <div style={{ fontSize: 11, color: '#4ade80', marginTop: 4 }}>
                  ✓ Extracted {job.total_voters} voters
                </div>
              )}

              {job.status === 'error' && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: '#f87171', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.4, marginBottom: 8, background: 'rgba(239, 68, 68, 0.1)', padding: 8, borderRadius: 4 }}>
                    ⚠️ {job.error_message}
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        await fetch('/api/jobs/retry', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ jobId: job.id })
                        })
                        fetchJobs() // refresh immediately
                      } catch (e) {
                        console.error(e)
                      }
                    }}
                    style={{ 
                      background: '#3b82f6', 
                      color: 'white', 
                      border: 'none', 
                      padding: '4px 12px', 
                      borderRadius: 4, 
                      fontSize: 11, 
                      fontWeight: 600, 
                      cursor: 'pointer' 
                    }}
                  >
                    ↺ Retry Job
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'running') {
    return <span style={{ fontSize: 11, background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Running</span>
  }
  if (status === 'pending') {
    return <span style={{ fontSize: 11, background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Pending</span>
  }
  if (status === 'done') {
    return <span style={{ fontSize: 11, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Done</span>
  }
  return <span style={{ fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Failed</span>
}
