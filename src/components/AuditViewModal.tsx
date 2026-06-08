'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'

interface AuditViewModalProps {
  sourcePdf: string
  pageNo: number
  onClose: () => void
}

export function AuditViewModal({ sourcePdf, pageNo, onClose }: AuditViewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPdf() {
      try {
        const supabase = createClient()
        
        // Try getting a signed URL (valid for 1 hour)
        const { data, error } = await supabase.storage
          .from('voter-pdfs')
          .createSignedUrl(sourcePdf, 3600)

        if (error) {
          throw error
        }

        if (data?.signedUrl) {
          // Append #page=X to tell the browser's native PDF viewer to jump to that page
          setPdfUrl(`${data.signedUrl}#page=${pageNo}`)
        } else {
          setError("Could not generate URL")
        }
      } catch (err: any) {
        console.error('Failed to load PDF:', err)
        setError(err.message || 'Failed to load original PDF')
      } finally {
        setLoading(false)
      }
    }

    loadPdf()
  }, [sourcePdf, pageNo])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        width: '100%',
        maxWidth: 1000,
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        animation: 'fade-in 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--color-text-primary)' }}>
              Data Audit View
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Verifying against {sourcePdf} (Page {pageNo})
            </p>
          </div>
          <button 
            onClick={onClose}
            className="btn-ghost"
            style={{ fontSize: 24, lineHeight: 1, padding: '4px 12px', color: 'var(--color-text-secondary)' }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, position: 'relative', background: '#222' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              Generating secure PDF link...
            </div>
          )}
          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              ⚠️ {error}
            </div>
          )}
          {pdfUrl && !error && (
            <iframe 
              src={pdfUrl} 
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="PDF Verification View"
            />
          )}
        </div>
      </div>
    </div>
  )
}
