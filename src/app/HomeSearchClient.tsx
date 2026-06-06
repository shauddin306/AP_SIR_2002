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
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select
          value={assemblyNo}
          onChange={e => setAssemblyNo(e.target.value)}
          className="search-input-mockup"
          style={{ width: 280, appearance: 'auto', paddingRight: 32, cursor: 'pointer' }}
        >
          <option value="">🌎 All of Andhra Pradesh</option>
          {assemblies.map(a => (
            <option key={a.no} value={a.no}>{a.no} - {a.name}</option>
          ))}
        </select>
        
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Name, EPIC No., or Address..."
            className="search-input-mockup"
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
