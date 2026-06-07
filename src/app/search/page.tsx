'use client'

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { SearchBar } from '@/components/SearchBar'
import { VoterTable } from '@/components/VoterTable'
import { SearchResult, VoterPart, supabase } from '@/lib/supabase/client'

function SearchPageInner() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [filterAssemblyNo, setFilterAssemblyNo] = useState(searchParams.get('assembly_no') || '')
  const [filterPartNo, setFilterPartNo] = useState(searchParams.get('part_no') || '')
  const [filterRelativeName, setFilterRelativeName] = useState(searchParams.get('relative_name') || '')
  const [familyView, setFamilyView] = useState<{house_no_normalized: number, part_no: number, house_no_raw: string} | null>(null)
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'EXACT' | 'CLOSE' | 'POSSIBLE'>('ALL')
  
  const [metadata, setMetadata] = useState<VoterPart[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showLoginRequired, setShowLoginRequired] = useState(false)

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
    if (!filterAssemblyNo) return []
    return metadata.filter(m => m.assembly_no.toString() === filterAssemblyNo).map(m => m.part_no).sort((a, b) => a - b)
  }, [metadata, filterAssemblyNo])

  // Clear partNo if selected assembly changes and part is no longer valid
  useEffect(() => {
    if (filterAssemblyNo && filterPartNo && !availableParts.includes(Number(filterPartNo)) && availableParts.length > 0) {
      setFilterPartNo('')
    }
  }, [filterAssemblyNo, availableParts, filterPartNo])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (
    q: string, 
    assemblyNo?: string, 
    partNo?: string,
    relName?: string,
    famHouseNormalized?: number,
    famPart?: number
  ) => {
    if (!famHouseNormalized && !q.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }
    setIsLoading(true)
    setHasSearched(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      params.set('limit', '20')
      if (assemblyNo) params.set('assembly_no', assemblyNo)
      if (partNo) params.set('part_no', partNo)
      if (relName) params.set('relative_name', relName)
      if (famHouseNormalized != null && famPart) {
        params.set('family_house_no_normalized', famHouseNormalized.toString())
        params.set('family_part_no', famPart.toString())
      }
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      
      if (res.status === 403 && data.error === 'LOGIN_REQUIRED') {
        setShowLoginRequired(true)
        setIsLoading(false)
        return
      }

      const sortedResults = (data.results || []).sort((a: SearchResult, b: SearchResult) => {
        const order = { 'EXACT': 1, 'CLOSE': 2, 'POSSIBLE': 3 }
        const aVal = order[a.match_type] || 4
        const bVal = order[b.match_type] || 4
        if (aVal !== bVal) return aVal - bVal
        return (b.match_score || 0) - (a.match_score || 0)
      })
      setResults(sortedResults)
      setMatchFilter('ALL')
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search for filters only
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (familyView) {
        doSearch('', '', '', '', familyView.house_no_normalized, familyView.part_no)
      } else {
        doSearch(query, filterAssemblyNo, filterPartNo, filterRelativeName)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filterAssemblyNo, filterPartNo, filterRelativeName, familyView]) // Removed query to stop live-search

  const handleSearchSubmit = useCallback(() => {
    if (familyView) return
    doSearch(query, filterAssemblyNo, filterPartNo, filterRelativeName)
  }, [query, filterAssemblyNo, filterPartNo, filterRelativeName, familyView, doSearch])

  // Count by match type
  const exactCount = results.filter(r => r.match_type === 'EXACT').length
  const closeCount = results.filter(r => r.match_type === 'CLOSE').length
  const possibleCount = results.filter(r => r.match_type === 'POSSIBLE').length

  const filteredResults = matchFilter === 'ALL' ? results : results.filter(r => r.match_type === matchFilter)

  return (
    <div className="search-page-container" style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
          {familyView ? '👨‍👩‍👧‍👦 Family View' : '🔍 AI Voter Search'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          {familyView 
            ? `Viewing all voters at House No. ${familyView.house_no_raw} in Part ${familyView.part_no}`
            : 'Search across all uploaded voter lists. Works with Telugu, English, EPIC IDs, house numbers, and misspellings.'}
        </p>
      </div>

      {showLoginRequired && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
        }}>
          <div className="card-glass" style={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 48, textAlign: 'center', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🔒</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>Login Required</h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: 32 }}>
              You have reached the free search limit for your IP address. Please sign in to continue searching the directory.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                onClick={() => setShowLoginRequired(false)}
                style={{ padding: '12px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
              >
                Close
              </button>
              <a
                href="/admin/login"
                style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, display: 'inline-block' }}
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      )}

      {!familyView && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 24,
          flexDirection: 'column',
        }}>
          {/* Search Input */}
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={handleSearchSubmit}
            isLoading={isLoading}
            resultCount={hasSearched ? results.length : undefined}
            autoFocus
          />
        </div>
      )}

      {/* Filters (also hidden in family view usually, but let's keep the existing logic) */}
      {!familyView && (
        <>
          <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Relative Name:</label>
              <input
                id="filter-relative-name"
                className="input filter-input"
                type="text"
                value={filterRelativeName}
                onChange={e => setFilterRelativeName(e.target.value)}
                placeholder="Father / Husband..."
                style={{ width: 160, padding: '6px 10px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Assembly No:</label>
              <select
                id="filter-assembly-no"
                className="input"
                value={filterAssemblyNo}
                onChange={e => setFilterAssemblyNo(e.target.value)}
                style={{ width: 140, padding: '6px 10px', appearance: 'auto' }}
              >
                <option value="">All Assemblies</option>
                {uniqueAssemblies.map(a => (
                  <option key={a.no} value={a.no}>{a.no} - {a.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Part No:</label>
              <select
                id="filter-part-no"
                className="input"
                value={filterPartNo}
                onChange={e => setFilterPartNo(e.target.value)}
                style={{ width: 100, padding: '6px 10px', appearance: 'auto' }}
                disabled={!filterAssemblyNo}
              >
                <option value="">All Parts</option>
                {availableParts.map(p => (
                  <option key={p} value={p}>Part {p}</option>
                ))}
              </select>
            </div>
            {(filterAssemblyNo || filterPartNo || filterRelativeName) && (
              <button
                className="btn-ghost"
                onClick={() => { setFilterAssemblyNo(''); setFilterPartNo(''); setFilterRelativeName('') }}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                ✕ Clear Filters
              </button>
            )}
          </div>
        </>
      )}

      {familyView && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn-primary"
              onClick={() => setFamilyView(null)}
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              ← Back to Search Results
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="glass-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                🏠 House: {familyView.house_no_raw || familyView.house_no_normalized} (Part {familyView.part_no})
              </div>
              <div className="glass-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                👥 Total Residents: {results.length}
              </div>
            </div>
          </div>
          
          {results.length > 10 && (
            <div className="animate-fade-in" style={{ 
              marginTop: 16, 
              padding: '16px 20px', 
              borderRadius: 'var(--radius-lg)', 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}>
              <div style={{ fontSize: 24 }}>🚩</div>
              <div>
                <h3 style={{ color: '#f87171', margin: '0 0 4px 0', fontSize: 16, fontWeight: 700 }}>Potential Ghost Voter Warning</h3>
                <p style={{ color: 'rgba(252, 165, 165, 0.9)', margin: 0, fontSize: 14 }}>
                  This house has an abnormally high number of registered voters ({results.length}). Please manually verify the family tree and relations below to ensure there are no duplicate registrations.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Match type summary */}
      {hasSearched && results.length > 0 && (
        <div className="animate-fade-in match-summary" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {exactCount > 0 && (
            <button
              onClick={() => setMatchFilter(matchFilter === 'EXACT' ? 'ALL' : 'EXACT')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                background: 'var(--color-exact-bg)', borderRadius: 10, cursor: 'pointer',
                border: matchFilter === 'EXACT' ? '2px solid var(--color-exact)' : '1px solid rgba(16,185,129,0.3)',
                opacity: matchFilter === 'ALL' || matchFilter === 'EXACT' ? 1 : 0.5,
              }}>
              <span className="badge-exact">EXACT</span>
              <span style={{ fontWeight: 700, color: 'var(--color-exact)' }}>{exactCount}</span>
            </button>
          )}
          {closeCount > 0 && (
            <button
              onClick={() => setMatchFilter(matchFilter === 'CLOSE' ? 'ALL' : 'CLOSE')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                background: 'var(--color-close-bg)', borderRadius: 10, cursor: 'pointer',
                border: matchFilter === 'CLOSE' ? '2px solid var(--color-close)' : '1px solid rgba(245,158,11,0.3)',
                opacity: matchFilter === 'ALL' || matchFilter === 'CLOSE' ? 1 : 0.5,
              }}>
              <span className="badge-close">CLOSE</span>
              <span style={{ fontWeight: 700, color: 'var(--color-close)' }}>{closeCount}</span>
            </button>
          )}
          {possibleCount > 0 && (
            <button
              onClick={() => setMatchFilter(matchFilter === 'POSSIBLE' ? 'ALL' : 'POSSIBLE')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                background: 'var(--color-possible-bg)', borderRadius: 10, cursor: 'pointer',
                border: matchFilter === 'POSSIBLE' ? '2px solid var(--color-possible)' : '1px solid rgba(249,115,22,0.3)',
                opacity: matchFilter === 'ALL' || matchFilter === 'POSSIBLE' ? 1 : 0.5,
              }}>
              <span className="badge-possible">POSSIBLE</span>
              <span style={{ fontWeight: 700, color: 'var(--color-possible)' }}>{possibleCount}</span>
            </button>
          )}

          <div className="match-summary-text" style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center',
            fontSize: 13, color: 'var(--color-text-muted)',
          }}>
            Showing {matchFilter === 'ALL' ? `top ${results.length}` : `${filteredResults.length}`} results
            {' — '}
            <span style={{ color: 'var(--color-accent-text)', fontWeight: 600, marginLeft: 4 }}>
              sorted by exact match
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Legend */}
        {hasSearched && results.length > 0 && (
          <div style={{
            display: 'flex', gap: 16, padding: '12px 20px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            flexWrap: 'wrap',
          }}>
            <LegendItem badge="badge-exact" label="EXACT — Direct match by ID, name, or house" />
            <LegendItem badge="badge-close" label="CLOSE — Prefix or high-similarity match" />
            <LegendItem badge="badge-possible" label="POSSIBLE — Phonetic / fuzzy match" />
          </div>
        )}

        <VoterTable
          voters={filteredResults}
          isLoading={isLoading}
          showMatchType={hasSearched && !familyView}
          onViewFamily={(house_no_normalized, part_no, house_no_raw) => setFamilyView({ house_no_normalized, part_no, house_no_raw })}
          userRole={userRole}
        />

        {/* Empty state with query */}
        {hasSearched && !isLoading && results.length === 0 && query && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤔</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No voters found for "{query}"</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>
              Try a different spelling, shorter name, or EPIC ID
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              <button
                className="btn-ghost"
                onClick={() => setQuery(query.slice(0, Math.ceil(query.length / 2)))}
                style={{ fontSize: 13 }}
              >
                Try shorter: "{query.slice(0, Math.ceil(query.length / 2))}"
              </button>
              <button className="btn-ghost" onClick={() => setQuery('')} style={{ fontSize: 13 }}>
                Clear Search
              </button>
            </div>
            
            <div style={{ padding: '16px 24px', borderRadius: 12, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', display: 'inline-block' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <strong>Not found here?</strong> Try checking the official electoral portal for verification.
              </p>
            </div>
          </div>
        )}

        {/* Initial state */}
        {!hasSearched && !isLoading && (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Start Searching</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
              Type any voter name in Telugu (షరీఫున్నీసా) or English (Shareefunnisa),
              EPIC ID, house number, or relative name. AI handles misspellings automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  )
}

function LegendItem({ badge, label }: { badge: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
      <span className={badge}>{badge.replace('badge-', '').toUpperCase()}</span>
      {label}
    </div>
  )
}
