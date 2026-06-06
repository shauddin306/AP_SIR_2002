'use client'

import { useEffect, useState } from 'react'

interface PartInfo {
  id: string
  part_no: number
  polling_station_name: string | null
  voter_count: number
}

interface AssemblyGroup {
  assembly_name: string
  assembly_no: number
  parts: PartInfo[]
}

export function CompletedParts() {
  const [assemblies, setAssemblies] = useState<AssemblyGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchParts = async () => {
    try {
      const res = await fetch('/api/parts')
      const data = await res.json()
      if (data.assemblies) {
        setAssemblies(data.assemblies)
      }
    } catch (err) {
      console.error('Failed to fetch completed parts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Poll every 10 seconds to keep it fresh during uploads
  useEffect(() => {
    fetchParts()
    const int = setInterval(fetchParts, 10000)
    return () => clearInterval(int)
  }, [])

  if (isLoading) {
    return <div style={{ opacity: 0.5 }}>Loading directory...</div>
  }

  if (assemblies.length === 0) {
    return (
      <div style={{ padding: 16, backgroundColor: '#1a1f2e', borderRadius: 8, fontSize: 14 }}>
        No parts uploaded yet.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: -4 }}>
        Total System Database: <strong style={{ color: '#60a5fa' }}>{assemblies.reduce((acc, g) => acc + g.parts.length, 0)} PDFs</strong> successfully processed.
      </div>
      {assemblies.map((group) => (
        <div key={group.assembly_no} style={{ backgroundColor: '#1a1f2e', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>Assembly {group.assembly_no} - {group.assembly_name}</span>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{group.parts.length} PDFs</span>
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {group.parts.map(p => (
              <div 
                key={p.part_no} 
                style={{ 
                  backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                  color: '#4ade80', 
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  padding: '4px 12px', 
                  borderRadius: 16, 
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title={p.polling_station_name || `Part ${p.part_no}`}
              >
                Part {p.part_no}
                <span style={{ backgroundColor: '#22c55e', color: '#000', padding: '2px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                  {p.voter_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
