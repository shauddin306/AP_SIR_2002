'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { UploadZone } from '@/components/UploadZone'
import { ProgressTracker } from '@/components/ProgressTracker'
import { CompletedParts } from '@/components/CompletedParts'
import { ExtractionJob } from '@/lib/supabase/client'

type Step = 'upload' | 'metadata' | 'conflict' | 'processing' | 'done' | 'batch'
type UploadMode = 'file' | 'url' | 'eci_auto'
type ExtractionEngine = 'gemini' | 'python'

interface ConflictInfo {
  assembly_name: string
  assembly_no: number
  part_no: number
  voter_count: number
}

// Dictionary for fast auto-fill
const ASSEMBLY_DICT: Record<string, string> = {
  '152': 'Rayachoty',
  '154': 'Kadapa',
}

export default function UploadPdfClient() {
  const [step, setStep] = useState<Step>('upload')
  const [uploadMode, setUploadMode] = useState<UploadMode>('file')
  const [engine, setEngine] = useState<ExtractionEngine>('python')
  const [file, setFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [urlFetching, setUrlFetching] = useState(false)
  const [meta, setMeta] = useState({
    assembly_name: '',
    assembly_no: '',
    part_no: '',
    polling_station_name: '',
  })
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [job, setJob] = useState<ExtractionJob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Batch specific state
  const [batchStart, setBatchStart] = useState('')
  const [batchEnd, setBatchEnd] = useState('')
  const [batchCurrent, setBatchCurrent] = useState<number | null>(null)
  const [batchStatus, setBatchStatus] = useState<'idle' | 'running' | 'paused' | 'done'>('idle')
  const [batchLogs, setBatchLogs] = useState<{part: number, status: 'success' | 'error' | 'skipped', message?: string, url?: string, time: string}[]>([])
  const [batchTimeTaken, setBatchTimeTaken] = useState<string>('')
  
  // Refs to control the async loop without stale closures
  const isPausedRef = useRef(false)
  const isCancelledRef = useRef(false)

  // Auto-parse ECI URLs
  useEffect(() => {
    if (pdfUrl) {
      // Look for pattern like /S01/154/S01_154_47.pdf
      const match = pdfUrl.match(/_(\d+)_(\d+)\.pdf/i)
      if (match) {
        const [, assm, part] = match
        setMeta(prev => ({
          ...prev,
          assembly_no: assm,
          part_no: part,
          assembly_name: ASSEMBLY_DICT[assm] || prev.assembly_name
        }))
      }
    }
  }, [pdfUrl])

  // Poll job status
  useEffect(() => {
    if (!jobId || step !== 'processing') return
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`)
        const data = await res.json()
        setJob(data)
        if (data.status === 'done' || data.status === 'error') {
          clearInterval(poll)
          if (data.status === 'done') {
            setStep('done')
          } else if (data.status === 'error') {
            setError(`Extraction Failed: ${data.error_message}`)
            setStep('upload') // Revert to upload screen so they can try again
          }
        }
      } catch {}
    }, 2000)
    return () => clearInterval(poll)
  }, [jobId, step])

  const handleFileSelected = useCallback((f: File) => {
    setFile(f)
    setPdfUrl('')
    setStep('metadata')
    setError(null)
  }, [])

  const handleUrlSubmit = useCallback(async () => {
    if (!pdfUrl.trim()) return
    setUrlFetching(true)
    setError(null)
    try {
      // Validate URL is accessible
      const check = await fetch(`/api/upload/check-url?url=${encodeURIComponent(pdfUrl)}`)
      const { ok, size, error: urlErr } = await check.json()
      if (!ok) throw new Error(urlErr || 'URL not accessible')
      console.log('URL validated, PDF size:', size, 'bytes')
      setStep('metadata')
    } catch (err) {
      setError(String(err))
    } finally {
      setUrlFetching(false)
    }
  }, [pdfUrl])

  const formatTimeTaken = (startMs: number) => {
    const diff = Date.now() - startMs;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  const runBatchLoop = async (startNum: number, endNum: number, assmNo: string) => {
    setStep('batch')
    setBatchStatus('running')
    isPausedRef.current = false
    isCancelledRef.current = false
    
    let current = startNum
    setBatchCurrent(current)
    const startTimeMs = Date.now()

    while (current <= endNum) {
      if (isCancelledRef.current) {
        setBatchStatus('idle')
        break
      }
      
      while (isPausedRef.current) {
        if (isCancelledRef.current) break
        await new Promise(r => setTimeout(r, 1000))
      }
      
      if (isCancelledRef.current) break

      setBatchCurrent(current)
      
      const url = `https://www.eci.gov.in/sir/f1/S01/data/OLDSIRROLL/S01/${assmNo}/S01_${assmNo}_${current}.pdf`
      
      try {
        // 1. Send it to from-url to process
        const res = await fetch('/api/upload/from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdf_url: url,
            assembly_name: ASSEMBLY_DICT[assmNo] || 'Unknown',
            assembly_no: parseInt(assmNo),
            part_no: current,
            polling_station_name: `Auto-Fetched Part ${current}`,
            engine: engine,
          }),
        })
        const data = await res.json()
        
        if (data.error) throw new Error(data.error)
        
        if (data.conflict) {
          // In batch mode, if it already exists, we skip it to be safe
          setBatchLogs(prev => [{ part: current, status: 'skipped', message: 'Already exists in database', url, time: new Date().toLocaleTimeString() }, ...prev])
        } else {
          // 2. Start extraction job
          const confirmRes = await fetch('/api/upload/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'START',
              job_id: data.job_id,
              file_name: data.file_name,
              assembly_name: ASSEMBLY_DICT[assmNo] || 'Unknown',
              assembly_no: parseInt(assmNo),
              part_no: current,
              polling_station_name: `Auto-Fetched Part ${current}`,
              engine: engine,
            }),
          })
          const confirmData = await confirmRes.json()
          if (confirmData.error) throw new Error(confirmData.error)
          
          // 3. Poll for completion
          let isDone = false
          while (!isDone) {
            if (isCancelledRef.current) break
            const pollRes = await fetch(`/api/jobs/${data.job_id}`)
            const jobData = await pollRes.json()
            if (jobData.status === 'done') {
              isDone = true
              setBatchLogs(prev => [{ part: current, status: 'success', url, time: new Date().toLocaleTimeString() }, ...prev])
            } else if (jobData.status === 'error') {
              isDone = true
              setBatchLogs(prev => [{ part: current, status: 'error', message: jobData.error_message, url, time: new Date().toLocaleTimeString() }, ...prev])
            } else {
              await new Promise(r => setTimeout(r, 3000))
            }
          }
        }
      } catch (err: any) {
        setBatchLogs(prev => [{ part: current, status: 'error', message: err.message, url, time: new Date().toLocaleTimeString() }, ...prev])
      }

      current++
    }

    if (!isCancelledRef.current) {
      setBatchStatus('done')
      setBatchCurrent(null)
      setBatchTimeTaken(formatTimeTaken(startTimeMs))
    }
  }

  const handleEciAutoSubmit = useCallback(async () => {
    if (!meta.assembly_no || !batchStart || !batchEnd) return
    const startNum = parseInt(batchStart)
    const endNum = parseInt(batchEnd)
    if (startNum > endNum) {
      setError('Start Part must be less than or equal to End Part')
      return
    }
    
    setBatchLogs([])
    runBatchLoop(startNum, endNum, meta.assembly_no)
  }, [meta.assembly_no, batchStart, batchEnd])

  const handleMetadataSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file && !pdfUrl) return
    setIsSubmitting(true)
    setError(null)

    try {
      let data: any

      if (pdfUrl) {
        // URL mode: send URL to server to download and process
        const res = await fetch('/api/upload/from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdf_url: pdfUrl,
            assembly_name: meta.assembly_name,
            assembly_no: meta.assembly_no,
            part_no: meta.part_no,
            polling_station_name: meta.polling_station_name,
            engine: engine,
          }),
        })
        data = await res.json()
      } else {
        // File mode: upload the PDF
        const formData = new FormData()
        formData.append('file', file!)
        formData.append('assembly_name', meta.assembly_name)
        formData.append('assembly_no', meta.assembly_no)
        formData.append('part_no', meta.part_no)
        formData.append('polling_station_name', meta.polling_station_name)
        formData.append('engine', engine)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        data = await res.json()
      }

      if (data.error) throw new Error(data.error)

      setJobId(data.job_id)
      setFileName(data.file_name)

      if (data.conflict) {
        setConflict(data.existing)
        setStep('conflict')
      } else {
        await startExtraction(data.job_id, data.file_name, 'START')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSubmitting(false)
    }
  }, [file, pdfUrl, meta, engine])

  const startExtraction = useCallback(async (jid: string, fname: string, action: string) => {
    const res = await fetch('/api/upload/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        job_id: jid,
        file_name: fname,
        assembly_name: meta.assembly_name,
        assembly_no: parseInt(meta.assembly_no),
        part_no: parseInt(meta.part_no),
        polling_station_name: meta.polling_station_name,
        engine: engine,
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    setStep('processing')
    setConflict(null)
  }, [meta, engine])

  const handleConflictAction = useCallback(async (action: 'OVERWRITE' | 'CANCEL') => {
    if (action === 'CANCEL') {
      await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL', job_id: jobId }),
      })
      setStep('upload')
      setFile(null)
      setConflict(null)
      setJobId(null)
      return
    }
    try {
      setIsSubmitting(true)
      await startExtraction(jobId!, fileName, 'OVERWRITE')
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSubmitting(false)
    }
  }, [jobId, fileName, startExtraction])

  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setJob(null)
    setJobId(null)
    setFileName('')
    setConflict(null)
    setError(null)
    setMeta({ assembly_name: '', assembly_no: '', part_no: '', polling_station_name: '' })
    setBatchStart('')
    setBatchEnd('')
    setBatchStatus('idle')
    isCancelledRef.current = true
  }

  const steps = [
    { id: 'upload',     label: 'Upload PDF' },
    { id: 'metadata',   label: 'Assembly Info' },
    { id: 'processing', label: 'AI Extraction' },
    { id: 'done',       label: 'Complete' },
  ]
  const stepIdx = step === 'batch' ? 2 : steps.findIndex(s => s.id === step || (step === 'conflict' && s.id === 'metadata'))

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>

      {/* Page title */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          ⬆️ Upload Electoral Roll PDF
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Upload official electoral roll PDFs for high-speed AI data extraction and private search indexing.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, flexShrink: 0,
              background: i < stepIdx ? 'var(--color-success)' : i === stepIdx ? 'var(--gradient-brand)' : 'var(--color-bg-elevated)',
              color: i <= stepIdx ? 'white' : 'var(--color-text-muted)',
              border: i > stepIdx ? '1px solid var(--color-border)' : 'none',
            }}>
              {i < stepIdx ? '✓' : i + 1}
            </div>
            <span style={{
              marginLeft: 8, fontSize: 13, fontWeight: i === stepIdx ? 600 : 400,
              color: i === stepIdx ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 1, margin: '0 12px',
                background: i < stepIdx ? 'var(--color-success)' : 'var(--color-border)',
              }} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="animate-fade-in" style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 10,
          background: 'var(--color-error-bg)', color: 'var(--color-error)',
          border: '1px solid rgba(239,68,68,0.3)', fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* STEP: Upload — File tab OR URL tab */}
      {step === 'upload' && (
        <div className="animate-fade-in">
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setUploadMode('file')}
              style={{
                flex: 1, padding: '12px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                background: uploadMode === 'file' ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                color: uploadMode === 'file' ? 'white' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
              }}
            >📁 Upload PDF File</button>
            <button
              onClick={() => setUploadMode('url')}
              style={{
                flex: 1, padding: '12px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                background: uploadMode === 'url' ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                color: uploadMode === 'url' ? 'white' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
              }}
            >🔗 Paste URL</button>
            <button
              onClick={() => setUploadMode('eci_auto')}
              style={{
                flex: 1, padding: '12px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                background: uploadMode === 'eci_auto' ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                color: uploadMode === 'eci_auto' ? 'white' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
              }}
            >🤖 ECI Auto-Fetch</button>
          </div>

          {uploadMode === 'file' ? (
            <UploadZone onFileSelected={handleFileSelected} />
          ) : uploadMode === 'url' ? (
            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🔗 ECI PDF URL</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 20 }}>
                Paste the direct URL to any ECI voter list PDF. The server will download and process it automatically.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="url"
                  value={pdfUrl}
                  onChange={e => setPdfUrl(e.target.value)}
                  placeholder="https://www.eci.gov.in/sir/f1/S01/data/OLDSIRROLL/S01/152/S01_152_69.pdf"
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10, fontSize: 14,
                    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)', outline: 'none',
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                />
                <button
                  className="btn-primary"
                  onClick={handleUrlSubmit}
                  disabled={!pdfUrl.trim() || urlFetching}
                >
                  {urlFetching ? '⏳ Checking...' : '→ Next'}
                </button>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                💡 Example: https://www.eci.gov.in/sir/f1/S01/data/OLDSIRROLL/S01/154/S01_154_46.pdf
              </p>
              
              <div style={{ 
                marginTop: 24, padding: '12px 16px', borderRadius: 8, 
                backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--color-error)'
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🚫 CAUTION: No Merged PDFs
                </h4>
                <p style={{ fontSize: 13, margin: 0, opacity: 0.9 }}>
                  Please do not paste URLs that link to merged PDFs (e.g. multiple parts in one file). The system expects one single Part per PDF.
                </p>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🤖 Auto-Fetch from ECI</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 20 }}>
                Enter the Assembly and a range of Part numbers. The server will download and process them sequentially in the background.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Assembly No</label>
                  <input
                    type="number"
                    value={meta.assembly_no}
                    onChange={e => setMeta(p => ({ ...p, assembly_no: e.target.value }))}
                    placeholder="152"
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14,
                      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)', outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Start Part</label>
                  <input
                    type="number"
                    value={batchStart}
                    onChange={e => setBatchStart(e.target.value)}
                    placeholder="1"
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14,
                      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)', outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>End Part</label>
                  <input
                    type="number"
                    value={batchEnd}
                    onChange={e => setBatchEnd(e.target.value)}
                    placeholder="195"
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14,
                      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)', outline: 'none',
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleEciAutoSubmit()}
                  />
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={handleEciAutoSubmit}
                disabled={!meta.assembly_no || !batchStart || !batchEnd}
                style={{ width: '100%' }}
              >
                🚀 Start Batch Process
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP: Batch Mode Dashboard */}
      {step === 'batch' && (
        <div className="animate-fade-in card" style={{ padding: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
            {batchStatus === 'done' ? '✅ Batch Completed' : '🔄 Batch Extraction Running...'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
            Assembly: <strong>{ASSEMBLY_DICT[meta.assembly_no] || meta.assembly_no} ({meta.assembly_no})</strong> <br/>
            Parts: <strong>{batchStart} to {batchEnd}</strong>
          </p>

          {batchStatus !== 'done' && (
            <div style={{ padding: 24, background: 'var(--color-bg-elevated)', borderRadius: 12, border: '1px solid var(--color-border)', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {batchStatus === 'paused' ? '⏸️ Paused' : `⏳ Extracting Part ${batchCurrent}...`}
                </span>
                <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                  (Do not close this tab)
                </span>
              </div>
              
              {/* Controls */}
              <div style={{ display: 'flex', gap: 12 }}>
                {batchStatus === 'running' && (
                  <button 
                    onClick={() => { isPausedRef.current = true; setBatchStatus('paused') }}
                    style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--color-warning)', color: '#000', fontWeight: 600, cursor: 'pointer' }}
                  >⏸️ Pause</button>
                )}
                {batchStatus === 'paused' && (
                  <button 
                    onClick={() => { isPausedRef.current = false; setBatchStatus('running') }}
                    style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--color-success)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >▶️ Resume</button>
                )}
                <button 
                  onClick={() => { isCancelledRef.current = true; setBatchStatus('done') }}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--color-error)', background: 'transparent', color: 'var(--color-error)', fontWeight: 600, cursor: 'pointer' }}
                >⏹️ Stop Batch</button>
              </div>
            </div>
          )}

          {/* Logs */}
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Execution Logs</h3>
          <div style={{ 
            maxHeight: 300, overflowY: 'auto', background: '#0a0a0a', padding: 16, borderRadius: 8,
            fontFamily: 'monospace', fontSize: 13, border: '1px solid #333'
          }}>
            {batchLogs.length === 0 ? (
              <div style={{ color: '#666' }}>Initializing...</div>
            ) : (
              batchLogs.map((log, i) => (
                <div key={i} style={{ 
                  color: log.status === 'success' ? '#4ade80' : log.status === 'error' ? '#f87171' : '#facc15',
                  marginBottom: 8, borderBottom: '1px solid #222', paddingBottom: 8
                }}>
                  <div style={{ marginBottom: 2 }}>[{log.time}] Part {log.part}: {log.status.toUpperCase()} {log.message ? ` - ${log.message}` : ''}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>🔗 {log.url}</div>
                </div>
              ))
            )}
          </div>
          
          {(batchStatus === 'done' || batchStatus === 'idle') && (
            <div className="animate-fade-in" style={{ marginTop: 24, padding: 24, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)', marginBottom: 16 }}>📊 Batch Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <InfoRow label="Time Taken" value={batchTimeTaken || '0s'} />
                <InfoRow label="Total Success" value={String(batchLogs.filter(l => l.status === 'success').length)} highlight />
                <InfoRow label="Total Skipped" value={String(batchLogs.filter(l => l.status === 'skipped').length)} />
                <InfoRow label="Total Failed" value={String(batchLogs.filter(l => l.status === 'error').length)} />
              </div>
              <button className="btn-secondary" onClick={handleReset} style={{ width: '100%' }}>
                Start New Upload
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP: Metadata */}
      {step === 'metadata' && (file || pdfUrl) && (
        <div className="animate-fade-in">
          <div className="card" style={{ padding: 32, marginBottom: 20 }}>
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 24,
              background: 'var(--color-success-bg)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: 'var(--color-success)', fontSize: 14, fontWeight: 500,
            }}>
              ✅ {pdfUrl
                ? <><strong>URL ready:</strong> {pdfUrl.split('/').pop()}</>  
                : <><strong>File ready:</strong> {file?.name} ({((file?.size ?? 0) / 1024 / 1024).toFixed(1)} MB)</>
              }
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
              Assembly Information
            </h2>

            <form onSubmit={handleMetadataSubmit}>
              <div style={{ display: 'grid', gap: 16 }}>
                <FormField label="Assembly Name *" hint="e.g., Rayachoti">
                  <input
                    id="assembly-name"
                    className="input"
                    value={meta.assembly_name}
                    onChange={e => setMeta(p => ({ ...p, assembly_name: e.target.value }))}
                    placeholder="e.g., Rayachoti"
                    required
                  />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <FormField label="Assembly Number *" hint="e.g., 152">
                    <input
                      id="assembly-number"
                      className="input"
                      type="number"
                      value={meta.assembly_no}
                      onChange={e => setMeta(p => ({ ...p, assembly_no: e.target.value }))}
                      placeholder="e.g., 152"
                      required
                    />
                  </FormField>
                  <FormField label="Part Number *" hint="Must be unique">
                    <input
                      id="part-number"
                      className="input"
                      type="number"
                      value={meta.part_no}
                      onChange={e => setMeta(p => ({ ...p, part_no: e.target.value }))}
                      placeholder="e.g., 69"
                      required
                    />
                  </FormField>
                </div>

                <FormField label="Polling Station Name" hint="Optional">
                  <input
                    id="polling-station-name"
                    className="input"
                    value={meta.polling_station_name}
                    onChange={e => setMeta(p => ({ ...p, polling_station_name: e.target.value }))}
                    placeholder="e.g., Government High School, Rayachoti"
                  />
                </FormField>

                <div style={{ marginTop: 8, padding: 16, borderRadius: 12, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-primary)' }}>
                    ⚙️ Extraction Engine
                  </label>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12, marginTop: 0 }}>
                    Choose how voter data is extracted from the PDF.
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setEngine('gemini')}
                      style={{
                        flex: 1, padding: '14px 12px', borderRadius: 10, border: '2px solid',
                        borderColor: engine === 'gemini' ? 'var(--color-accent)' : 'var(--color-border)',
                        backgroundColor: engine === 'gemini' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        color: engine === 'gemini' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>🤖 Gemini AI</span>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                        padding: '2px 8px', borderRadius: 4,
                        background: engine === 'gemini' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                        color: engine === 'gemini' ? '#93c5fd' : 'var(--color-text-muted)'
                      }}>~95% Accuracy</span>
                      <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>₹1.75 / page • Paid API</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEngine('python')}
                      style={{
                        flex: 1, padding: '14px 12px', borderRadius: 10, border: '2px solid',
                        borderColor: engine === 'python' ? '#22c55e' : 'var(--color-border)',
                        backgroundColor: engine === 'python' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                        color: engine === 'python' ? '#22c55e' : 'var(--color-text-secondary)',
                        fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>⚡ Surya OCR</span>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                        padding: '2px 8px', borderRadius: 4,
                        background: engine === 'python' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                        color: engine === 'python' ? '#86efac' : 'var(--color-text-muted)'
                      }}>~80-85% Accuracy</span>
                      <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>100% Free • No API Key</span>
                    </button>
                  </div>
                  {engine === 'python' && (
                    <div style={{
                      marginTop: 10, padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)',
                      fontSize: 12, color: '#86efac', lineHeight: 1.5,
                    }}>
                      <strong>⚡ Surya OCR Engine:</strong> Uses local AI vision model — completely free, no API cost.
                      Requires the Python OCR server to be running (<code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>PYTHON_ENGINE_URL</code> env var).
                      Telugu names extracted + English transliterated automatically.
                    </div>
                  )}
                  {engine === 'gemini' && (
                    <div style={{
                      marginTop: 10, padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)',
                      fontSize: 12, color: '#93c5fd', lineHeight: 1.5,
                    }}>
                      <strong>🤖 Gemini AI Engine:</strong> Uses Google Gemini 2.5 Flash — highest accuracy for Telugu names.
                      Requires <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>GEMINI_API_KEY</code> and billed per page.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setStep('upload')}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1 }}
                    disabled={!meta.assembly_name || !meta.assembly_no || !meta.part_no || isSubmitting}
                  >
                    {isSubmitting ? 'Checking...' : engine === 'python' ? '⚡ Start Surya OCR (Free)' : '🤖 Start Gemini AI Extraction'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STEP: Conflict */}
      {step === 'conflict' && conflict && (
        <div className="card animate-fade-in" style={{ padding: 32 }}>
          <div style={{
            fontSize: 40, textAlign: 'center', marginBottom: 16,
          }}>⚠️</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
            Part Already Exists
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 24 }}>
            This part book is already in the database. Do you want to overwrite it?
          </p>

          <div style={{
            padding: 20, borderRadius: 12, marginBottom: 28,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InfoRow label="Assembly" value={conflict.assembly_name} />
              <InfoRow label="Assembly No" value={String(conflict.assembly_no)} />
              <InfoRow label="Part No" value={String(conflict.part_no)} />
              <InfoRow label="Existing Voters" value={conflict.voter_count?.toLocaleString() ?? '?'} highlight />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn-ghost"
              style={{ flex: 1 }}
              onClick={() => handleConflictAction('CANCEL')}
              disabled={isSubmitting}
            >
              ✕ Cancel
            </button>
            <button
              className="btn-danger"
              style={{ flex: 1 }}
              onClick={() => handleConflictAction('OVERWRITE')}
              disabled={isSubmitting}
            >
              {isSubmitting ? '⏳ Processing...' : '🔄 Overwrite Existing Data'}
            </button>
          </div>
        </div>
      )}

      {/* STEP: Processing */}
      {step === 'processing' && (
        <div className="animate-fade-in">
          <ProgressTracker job={job} />
          <p style={{ marginTop: 16, color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center' }}>
            You can leave this page — extraction continues in the background.
            Results will appear in <a href="/browser" style={{ color: 'var(--color-accent-text)' }}>Part Browser</a> as they are indexed.
          </p>
        </div>
      )}

      {/* STEP: Done */}
      {step === 'done' && job && (
        <div className="card animate-fade-in" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {job.error_message ? '⚠️' : '🎉'}
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
            {job.error_message ? 'Extraction Completed with Warnings' : 'Extraction Complete!'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Successfully saved{' '}
            <strong style={{ color: 'var(--color-success)', fontSize: 20 }}>
              {job.total_voters.toLocaleString()} voters
            </strong>{' '}
            (confirmed in database) from {job.total_pages} pages.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, textAlign: 'left', background: 'var(--color-bg-elevated)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <InfoRow label="Time Taken" value={batchTimeTaken || 'Completed'} />
            <InfoRow label="Source URL / File" value={pdfUrl ? pdfUrl.split('/').pop() || 'URL' : file?.name || 'File Upload'} />
          </div>

          {/* ✅ Warning banner if pages were skipped */}
          {job.error_message && (
            <div style={{
              padding: '12px 20px', borderRadius: 10, marginBottom: 24,
              background: 'rgba(255,180,0,0.12)', border: '1px solid rgba(255,180,0,0.4)',
              color: '#e6a800', fontSize: 14, textAlign: 'left',
            }}>
              <strong>⚠️ Partial Extract:</strong> {job.error_message}
              <br />
              <span style={{ opacity: 0.8 }}>
                The voters shown above are 100% confirmed in the database. If the count seems low vs. your PDF,
                please re-upload to retry failed pages.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href="/search" className="btn-primary">🔍 Search Voters</a>
            <a href="/browse" className="btn-ghost">📂 Browse Part</a>
            <button className="btn-ghost" onClick={handleReset}>⬆️ Upload Another</button>
          </div>
        </div>
      )}

        </div> {/* End left column */}

        {/* Right Column: Completed Parts Directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              Completed Parts
            </h2>
            <div style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="live-dot" style={{ width: 6, height: 6, backgroundColor: 'currentColor', borderRadius: '50%', display: 'inline-block' }} /> Live
            </div>
          </div>
          <CompletedParts />
        </div>

      </div> {/* End grid */}

    </div>
  )
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
        {label} {hint && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontWeight: 700, fontSize: 16,
        color: highlight ? 'var(--color-accent-text)' : 'var(--color-text-primary)',
      }}>
        {value}
      </div>
    </div>
  )
}
