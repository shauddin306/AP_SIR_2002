'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomeSearchClient() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push('/search')
    }
  }

  return (
    <form onSubmit={handleSearch} style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ position: 'relative', marginBottom: 20 }}>
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

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
        <div className="glass-pill">Assembly Constituency</div>
        <div className="glass-pill">Polling Station/Part</div>
        <div className="glass-pill">Door Number</div>
        <div className="glass-pill">State/District</div>
      </div>

      <button type="submit" className="btn-mockup-blue">
        SEARCH NOW
      </button>
    </form>
  )
}
