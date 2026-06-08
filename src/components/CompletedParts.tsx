'use client'

import { useEffect, useState, useMemo } from 'react'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedAssemblies, setExpandedAssemblies] = useState<Set<number>>(new Set())

  const fetchParts = async () => {
    try {
      const res = await fetch('/api/parts')
      const data = await res.json()
      if (data.assemblies) {
        // Sort parts by part_no inside each assembly
        const sortedAssemblies = data.assemblies.map((a: AssemblyGroup) => ({
          ...a,
          parts: a.parts.sort((p1, p2) => p1.part_no - p2.part_no)
        })).sort((a1: AssemblyGroup, a2: AssemblyGroup) => a1.assembly_no - a2.assembly_no)
        
        setAssemblies(sortedAssemblies)
        
        // Auto-expand the first assembly if none are expanded and we just loaded
        if (expandedAssemblies.size === 0 && sortedAssemblies.length > 0) {
          setExpandedAssemblies(new Set([sortedAssemblies[0].assembly_no]))
        }
      }
    } catch (err) {
      console.error('Failed to fetch completed parts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Poll every 10 seconds to keep it fresh
  useEffect(() => {
    fetchParts()
    const int = setInterval(fetchParts, 10000)
    return () => clearInterval(int)
  }, [])

  const toggleAssembly = (assemblyNo: number) => {
    setExpandedAssemblies(prev => {
      const next = new Set(prev)
      if (next.has(assemblyNo)) {
        next.delete(assemblyNo)
      } else {
        next.add(assemblyNo)
      }
      return next
    })
  }

  const filteredAssemblies = useMemo(() => {
    if (!searchQuery.trim()) return assemblies
    const query = searchQuery.toLowerCase()
    return assemblies.filter(a => 
      a.assembly_name.toLowerCase().includes(query) || 
      String(a.assembly_no).includes(query)
    )
  }, [assemblies, searchQuery])

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

  const totalPdfs = assemblies.reduce((acc, g) => acc + g.parts.length, 0)
  const totalVoters = assemblies.reduce((acc, g) => acc + g.parts.reduce((sum, p) => sum + p.voter_count, 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>
            Total System Database: <strong style={{ color: '#60a5fa' }}>{totalPdfs.toLocaleString()} PDFs</strong> processed.
          </span>
          <span>
            Total Voters: <strong style={{ color: '#4ade80' }}>{totalVoters.toLocaleString()}</strong>
          </span>
        </div>
        
        {assemblies.length > 1 && (
          <input
            type="text"
            placeholder="Search Assemblies (e.g. 152 or Rayachoty)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid rgba(51, 65, 85, 0.8)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#f8fafc',
              outline: 'none',
              fontSize: 14,
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = 'rgba(51, 65, 85, 0.8)'}
          />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredAssemblies.map((group) => {
          const isExpanded = expandedAssemblies.has(group.assembly_no) || (searchQuery.trim().length > 0 && filteredAssemblies.length <= 3)
          
          return (
            <div key={group.assembly_no} style={{ 
              backgroundColor: '#1a1f2e', 
              borderRadius: 8, 
              border: '1px solid rgba(51, 65, 85, 0.5)',
              overflow: 'hidden'
            }}>
              <button 
                onClick={() => toggleAssembly(group.assembly_no)}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px',
                  background: isExpanded ? 'rgba(30, 41, 59, 0.5)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ 
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                    transition: 'transform 0.2s',
                    color: '#94a3b8',
                    fontSize: 12
                  }}>
                    ▶
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc' }}>
                    Assembly {group.assembly_no} - {group.assembly_name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    {group.parts.reduce((sum, p) => sum + p.voter_count, 0).toLocaleString()} voters
                  </span>
                  <span style={{ 
                    fontSize: 12, 
                    color: '#60a5fa', 
                    fontWeight: 600,
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '2px 8px',
                    borderRadius: 12,
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    {group.parts.length} Parts
                  </span>
                </div>
              </button>
              
              {isExpanded && (
                <div style={{ 
                  padding: '16px', 
                  borderTop: '1px solid rgba(51, 65, 85, 0.5)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: 8,
                  maxHeight: 400,
                  overflowY: 'auto'
                }}>
                  {group.parts.map(p => (
                    <div 
                      key={p.part_no} 
                      style={{ 
                        backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                        color: '#4ade80', 
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        padding: '6px 10px', 
                        borderRadius: 8, 
                        fontSize: 13,
                        fontWeight: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        textAlign: 'center'
                      }}
                      title={p.polling_station_name || `Part ${p.part_no}`}
                    >
                      <span>Part {p.part_no}</span>
                      <span style={{ backgroundColor: '#22c55e', color: '#000', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                        {p.voter_count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {filteredAssemblies.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            No assemblies found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  )
}
