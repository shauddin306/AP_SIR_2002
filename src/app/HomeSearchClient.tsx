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
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <select
          value={assemblyNo}
          onChange={e => setAssemblyNo(e.target.value)}
          className="search-input-mockup"
          style={{ appearance: 'auto', paddingRight: 32, cursor: 'pointer', fontWeight: 600, width: '100%' }}
        >
          <option value="">🌎 All Assemblies</option>
          {assemblies.map(a => (
            <option key={a.no} value={a.no}>{a.no} - {a.name}</option>
          ))}
        </select>
        
        <select
          value="" // For now just a placeholder on home screen, or we can add partNo state
          onChange={() => {}} 
          className="search-input-mockup hidden md:block"
          style={{ width: 140, appearance: 'auto', paddingRight: 32, cursor: 'pointer', opacity: assemblyNo ? 1 : 0.5 }}
          disabled={!assemblyNo}
        >
          <option value="">All Parts</option>
        </select>
        
        <div style={{ position: 'relative', flex: 1, width: '100%' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any combination: Door No, Name, or EPIC ID..."
            className="search-input-mockup"
            style={{ fontWeight: 600, width: '100%' }}
          />
          <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            🔍
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
        <div className="glass-pill">Fast Partition Searching</div>
        <div className="glass-pill">AI Phonetic Hash Matching</div>
        <div className="glass-pill">Zero Latency</div>
      </div>

      <button type="submit" className="btn-mockup-blue">
        SEARCH NOW
      </button>
    </form>
  )
}
