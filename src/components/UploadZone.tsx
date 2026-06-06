'use client'

import { useState, useCallback, useRef } from 'react'

interface UploadZoneProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateAndSet = useCallback((file: File) => {
    setError(null)
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted. Please upload a valid voter list PDF.')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File is too large (max 100 MB).')
      return
    }
    onFileSelected(file)
  }, [onFileSelected])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSet(file)
  }, [validateAndSet])

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? 'var(--color-accent)' : 'var(--color-border-bright)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: '60px 40px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: isDragging
          ? 'rgba(59,130,246,0.08)'
          : 'var(--color-bg-elevated)',
        transition: 'all 0.25s ease',
        transform: isDragging ? 'scale(1.01)' : 'scale(1)',
        boxShadow: isDragging ? 'var(--shadow-glow)' : 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && validateAndSet(e.target.files[0])}
        disabled={disabled}
        id="pdf-upload-input"
      />

      <div style={{ fontSize: 56, marginBottom: 16 }}>
        {isDragging ? '📂' : '📄'}
      </div>

      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
        {isDragging ? 'Drop it here!' : 'Upload Voter List PDF'}
      </div>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
        Drag and drop your PDF here, or click to browse
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
        Supports scanned voter list PDFs · Max 100 MB · Andhra Pradesh format
      </div>

      {error && (
        <div style={{
          marginTop: 16, padding: '10px 16px', borderRadius: 8,
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          border: '1px solid rgba(239,68,68,0.3)',
          fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}
