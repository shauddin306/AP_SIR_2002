'use client'

import { useState, useEffect, useCallback } from 'react'
import { VoterTable } from '@/components/VoterTable'
import { VoterPart, VoterRow } from '@/lib/supabase/client'

type Assembly = {
  assembly_name: string
  assembly_no: number
  parts: VoterPart[]
}

export default function BrowserPage() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [selectedPart, setSelectedPart] = useState<VoterPart | null>(null)
  const [voters, setVoters] = useState<VoterRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingParts, setIsLoadingParts] = useState(true)
  const [expandedAssemblies, setExpandedAssemblies] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState('house_no_normalized')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const PAGE_SIZE = 50

  // Load assemblies
  useEffect(() => {
    fetch('/api/parts')
      .then(r => r.json())
      .then(data => {
        setAssemblies(data.assemblies || [])
        // Auto-expand first assembly
        if (data.assemblies?.length) {
          setExpandedAssemblies(new Set([data.assemblies[0].assembly_no]))
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingParts(false))
  }, [])

  // Load voters for selected part
  const loadVoters = useCallback(async (part: VoterPart, p: number, sb: string, sd: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        assembly_no: String(part.assembly_no),
        part_no: String(part.part_no),
        page: String(p),
        page_size: String(PAGE_SIZE),
        sort_by: sb,
        sort_dir: sd,
      })
      const res = await fetch(`/api/parts?${params}`)
      const data = await res.json()
      setVoters(data.voters || [])
      setTotalPages(data.total_pages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSelectPart = useCallback((part: VoterPart) => {
    setSelectedPart(part)
    setPage(1)
    setSortBy('house_no_normalized')
    setSortDir('asc')
    loadVoters(part, 1, 'house_no_normalized', 'asc')
  }, [loadVoters])

  const handleSort = useCallback((col: string, dir: 'asc' | 'desc') => {
    setSortBy(col)
    setSortDir(dir)
    if (selectedPart) loadVoters(selectedPart, page, col, dir)
  }, [selectedPart, page, loadVoters])

  const handlePage = useCallback((newPage: number) => {
    setPage(newPage)
    if (selectedPart) loadVoters(selectedPart, newPage, sortBy, sortDir)
  }, [selectedPart, sortBy, sortDir, loadVoters])

  const toggleAssembly = (assemblyNo: number) => {
    setExpandedAssemblies(prev => {
      const next = new Set(prev)
      if (next.has(assemblyNo)) next.delete(assemblyNo)
      else next.add(assemblyNo)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', maxWidth: 1600, margin: '0 auto' }}>

      {/* Sidebar */}
      <aside style={{
        width: 280, flexShrink: 0, borderRight: '1px solid var(--color-border)',
        padding: '20px 12px', overflowY: 'auto',
        position: 'sticky', top: 60, height: 'calc(100vh - 60px)',
        background: 'var(--color-bg-elevated)',
      }}>
        <div style={{ marginBottom: 16, padding: '0 8px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📂 Part Browser</h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {assemblies.length} assemblies
          </p>
        </div>

        {isLoadingParts ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 36, marginBottom: 6, borderRadius: 8 }} />
            ))}
          </div>
        ) : assemblies.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No parts uploaded yet.</p>
            <a href="/upload" className="btn-primary" style={{ display: 'inline-block', marginTop: 12, fontSize: 13 }}>
              Upload PDF
            </a>
          </div>
        ) : (
          <div>
            {assemblies.map(assembly => (
              <div key={assembly.assembly_no} style={{ marginBottom: 4 }}>
                {/* Assembly header */}
                <button
                  onClick={() => toggleAssembly(assembly.assembly_no)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: expandedAssemblies.has(assembly.assembly_no)
                      ? 'rgba(59,130,246,0.12)' : 'transparent',
                    color: expandedAssemblies.has(assembly.assembly_no)
                      ? 'var(--color-accent-text)' : 'var(--color-text-primary)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🏛️</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{assembly.assembly_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        No. {assembly.assembly_no} · {assembly.parts.length} parts
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {expandedAssemblies.has(assembly.assembly_no) ? '▼' : '▶'}
                  </span>
                </button>

                {/* Parts list */}
                {expandedAssemblies.has(assembly.assembly_no) && (
                  <div style={{ marginLeft: 12, marginTop: 2 }}>
                    {assembly.parts.map(part => (
                      <button
                        key={part.id}
                        onClick={() => handleSelectPart(part)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '7px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          marginBottom: 2, transition: 'all 0.15s',
                          background: selectedPart?.id === part.id
                            ? 'rgba(59,130,246,0.2)' : 'transparent',
                          color: selectedPart?.id === part.id
                            ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                          borderLeft: selectedPart?.id === part.id
                            ? '2px solid var(--color-accent)' : '2px solid transparent',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>Part {part.part_no}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
                            {part.voter_count?.toLocaleString() ?? 0} voters
                          </div>
                        </div>
                        <span style={{ fontSize: 11, opacity: 0.5 }}>→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '20px 24px', overflowX: 'auto' }}>
        {!selectedPart ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', flexDirection: 'column' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>👈</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Select a Part</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Choose an assembly and part from the sidebar to view voter records.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Part header */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800 }}>
                  {selectedPart.assembly_name} — Part {selectedPart.part_no}
                </h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
                  {selectedPart.polling_station_name && `${selectedPart.polling_station_name} · `}
                  <strong style={{ color: 'var(--color-accent-text)' }}>{total.toLocaleString()}</strong> total voters
                  {' · '}Page {page} of {totalPages}
                </p>
              </div>
              <a href={`/search?assembly_no=${selectedPart.assembly_no}&part_no=${selectedPart.part_no}`}
                className="btn-ghost" style={{ fontSize: 13 }}>
                🔍 Search this Part
              </a>
            </div>

            {/* Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <VoterTable
                voters={voters}
                isLoading={isLoading}
                onSort={handleSort}
                sortBy={sortBy}
                sortDir={sortDir}
              />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, alignItems: 'center' }}>
                <button
                  className="btn-ghost"
                  onClick={() => handlePage(1)}
                  disabled={page === 1 || isLoading}
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >«</button>
                <button
                  className="btn-ghost"
                  onClick={() => handlePage(page - 1)}
                  disabled={page === 1 || isLoading}
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >‹ Prev</button>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 8px' }}>
                  Page {page} / {totalPages}
                </span>
                <button
                  className="btn-ghost"
                  onClick={() => handlePage(page + 1)}
                  disabled={page === totalPages || isLoading}
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >Next ›</button>
                <button
                  className="btn-ghost"
                  onClick={() => handlePage(totalPages)}
                  disabled={page === totalPages || isLoading}
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >»</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
