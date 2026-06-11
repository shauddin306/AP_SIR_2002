'use client'

import { useState, useMemo, Suspense, useEffect } from 'react'
import { VoterTable } from '@/components/VoterTable'
import { VoterRow, VoterPart, supabase } from '@/lib/supabase/client'

function BrowsePageInner() {
  const [assemblyNo, setAssemblyNo] = useState('')
  const [partNo, setPartNo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [voters, setVoters] = useState<VoterRow[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  
  // Local instantaneous filter
  const [localFilter, setLocalFilter] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [showPdf, setShowPdf] = useState(true)

  const [metadata, setMetadata] = useState<VoterPart[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('voter_parts').select('*').then(({ data }) => {
      if (data) setMetadata(data as VoterPart[])
    })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('user_roles').select('role').eq('id', user.id).single().then(({ data }) => {
          if (data) setUserRole(data.role)
        })
      }
    })
  }, [])

  const uniqueAssemblies = useMemo(() => {
    const map = new Map<number, string>()
    metadata.forEach(m => map.set(m.assembly_no, m.assembly_name))
    return Array.from(map.entries()).map(([no, name]) => ({ no, name })).sort((a, b) => a.no - b.no)
  }, [metadata])

  const availableParts = useMemo(() => {
    if (!assemblyNo) return []
    return metadata.filter(m => m.assembly_no.toString() === assemblyNo).map(m => m.part_no).sort((a, b) => a - b)
  }, [metadata, assemblyNo])

  // Clear partNo if selected assembly changes and part is no longer valid
  useEffect(() => {
    if (assemblyNo && partNo && !availableParts.includes(Number(partNo)) && availableParts.length > 0) {
      setPartNo('')
    }
  }, [assemblyNo, availableParts, partNo])


  const handleLoadDirectory = async () => {
    if (!assemblyNo || !partNo) return
    setIsLoading(true)
    setHasLoaded(true)
    try {
      // 1. Fetch voters data
      const res = await fetch(`/api/browse?assembly_no=${assemblyNo}&part_no=${partNo}`)
      const data = await res.json()
      setVoters(data.results || [])

      // 2. Fetch the source PDF for this part to display side-by-side
      const { data: jobData } = await supabase
        .from('extraction_jobs')
        .select('source_pdf')
        .eq('assembly_no', assemblyNo)
        .eq('part_no', partNo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (jobData?.source_pdf) {
        if (jobData.source_pdf.startsWith('http')) {
          setPdfUrl(jobData.source_pdf)
        } else {
          const { data: publicUrlData } = supabase.storage.from('voter-pdfs').getPublicUrl(jobData.source_pdf)
          setPdfUrl(publicUrlData.publicUrl)
        }
      } else {
        setPdfUrl(null)
      }
      
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Instant local filtering (Zero Latency)
  const filteredVoters = useMemo(() => {
    if (!localFilter.trim()) return voters
    const term = localFilter.toLowerCase().trim()
    return voters.filter(v => {
      const hn = (v.house_no || '').toLowerCase()
      const nEn = (v.voter_name_english || '').toLowerCase()
      const nTe = (v.voter_name_telugu || '').toLowerCase()
      const epic = (v.epic_id || '').toLowerCase()
      return hn.includes(term) || nEn.includes(term) || nTe.includes(term) || epic.includes(term)
    })
  }, [voters, localFilter])

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
          📁 Voter Directory Explorer
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          Browse raw data exactly as it appears in the PDF, strictly ordered by Door Number and Age.
        </p>
      </div>

      {/* Directory Selectors */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
            Assembly Constituency No.
          </label>
          <select
            className="input"
            value={assemblyNo}
            onChange={e => setAssemblyNo(e.target.value)}
            style={{ width: 240, appearance: 'auto' }}
          >
            <option value="">Select Assembly...</option>
            {uniqueAssemblies.map(a => (
              <option key={a.no} value={a.no}>{a.no} - {a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
            Part No.
          </label>
          <select
            className="input"
            value={partNo}
            onChange={e => setPartNo(e.target.value)}
            style={{ width: 150, appearance: 'auto' }}
            disabled={!assemblyNo}
          >
            <option value="">Select Part...</option>
            {availableParts.map(p => (
              <option key={p} value={p}>Part {p}</option>
            ))}
          </select>
        </div>
        <button 
          className="btn-primary" 
          onClick={handleLoadDirectory}
          disabled={!assemblyNo || !partNo || isLoading}
          style={{ padding: '12px 24px' }}
        >
          {isLoading ? 'Loading Data...' : 'Load Directory'}
        </button>
      </div>

      {/* Raw Data View */}
      {hasLoaded && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* PDF Viewer Side */}
          {showPdf && pdfUrl && (
            <div className="card" style={{ flex: '1 1 400px', height: '80vh', position: 'sticky', top: 24 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14, margin: 0, color: 'var(--color-text-primary)' }}>Original Source PDF</h3>
                <button onClick={() => setShowPdf(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13 }}>Hide</button>
              </div>
              <iframe 
                src={pdfUrl} 
                style={{ width: '100%', height: 'calc(100% - 45px)', border: 'none', background: '#e2e8f0' }}
                title="Voter PDF"
              />
            </div>
          )}

          {/* Table Side */}
          <div className="card" style={{ flex: '2 1 600px', overflow: 'hidden' }}>
            
            {/* Instant Filter Bar */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 280, display: 'flex', gap: 12 }}>
                {!showPdf && pdfUrl && (
                  <button onClick={() => setShowPdf(true)} className="btn-secondary" style={{ padding: '8px 12px' }}>
                    📄 Show PDF
                  </button>
                )}
                <input
                  type="text"
                  className="input"
                  placeholder="⚡ Instant Filter: Type House No, Name, or EPIC ID..."
                  value={localFilter}
                  onChange={e => setLocalFilter(e.target.value)}
                  style={{ width: '100%', maxWidth: 400, background: 'var(--color-bg)' }}
                />
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Showing <strong style={{ color: 'var(--color-text-primary)' }}>{filteredVoters.length}</strong> of {voters.length} voters
              </div>
            </div>

            <VoterTable
              voters={filteredVoters}
              isLoading={isLoading}
              userRole={userRole}
              showMatchType={false} 
              onViewFamily={(house_no_normalized, part_no, house_no_raw) => {
                setLocalFilter(house_no_raw)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
            
            {!isLoading && filteredVoters.length === 0 && voters.length > 0 && (
               <div style={{ padding: 48, textAlign: 'center' }}>
                 <h3 style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}>No matches for "{localFilter}" in this Part.</h3>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowsePageInner />
    </Suspense>
  )
}
