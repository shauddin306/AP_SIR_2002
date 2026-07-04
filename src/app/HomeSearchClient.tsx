'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomeSearchClient() {
  const [query, setQuery] = useState('')
  const [assemblyNo, setAssemblyNo] = useState('')
  const [assemblies, setAssemblies] = useState<{no: number, name: string}[]>([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/parts').then(res => res.json()).then(data => {
      if (data.assemblies) {
        setAssemblies(data.assemblies.map((a: any) => ({
          no: a.assembly_no,
          name: a.assembly_name
        })))
      }
    })
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    let url = '/search?'
    if (query.trim()) url += `q=${encodeURIComponent(query.trim())}&`
    if (assemblyNo) url += `assembly_no=${assemblyNo}&`
    router.push(url.replace(/&$/, ''))
  }

  return (
    <form onSubmit={handleSearch} style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
      
      {/* Unified Search Bar */}
      <div className="unified-search-bar mb-6">
        
        {/* Assembly Select */}
        <select
          value={assemblyNo}
          onChange={e => setAssemblyNo(e.target.value)}
          className="unified-select"
          style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.1)' }}
        >
          <option value="">🌎 All Assemblies</option>
          {assemblies.map(a => (
            <option key={a.no} value={a.no}>{a.no} - {a.name}</option>
          ))}
        </select>
        
        {/* Part Select (Placeholder for now) */}
        <select
          value=""
          onChange={() => {}} 
          className="unified-select hidden md:block"
          style={{ width: '140px', borderRight: '1px solid rgba(255,255,255,0.1)', opacity: assemblyNo ? 1 : 0.5 }}
          disabled={!assemblyNo}
        >
          <option value="">All Parts</option>
        </select>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Name, EPIC ID, or Door No..."
            className="unified-input"
          />
          <div style={{ paddingRight: 16, color: '#3b82f6', opacity: 0.8, pointerEvents: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>

        {/* Integrated Button */}
        <div style={{ paddingRight: 6 }}>
          <button type="submit" className="btn-mockup-blue" style={{ padding: '10px 24px', borderRadius: '100px', whiteSpace: 'nowrap' }}>
            SEARCH
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="glass-pill">⚡ Fast Partition Searching</div>
        <div className="glass-pill">🧠 AI Phonetic Matching</div>
        <div className="glass-pill">🚀 Zero Latency</div>
      </div>
    </form>
  )
}
