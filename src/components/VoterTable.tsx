'use client'

import { useState, useCallback, useEffect } from 'react'
import { VoterRow, SearchResult } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/browser'
import { AuditViewModal } from './AuditViewModal'

type VoterData = VoterRow | SearchResult

interface VoterTableProps {
  voters: VoterData[]
  isLoading?: boolean
  showMatchType?: boolean
  onSort?: (column: string, dir: 'asc' | 'desc') => void
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  onViewFamily?: (house_no_normalized: number, part_no: number, house_no_raw: string) => void
  userRole?: string | null
}

const COLUMNS = [
  { key: 'match_type',            label: 'Match',         width: 80,  searchOnly: true  },
  { key: 'serial_no',             label: 'S.No',          width: 60               },
  { key: 'house_no',              label: 'House No',      width: 90               },
  { key: 'voter_name_telugu',     label: 'Name (Telugu)', width: 160, telugu: true  },
  { key: 'voter_name_english',    label: 'Name (English)',width: 160              },
  { key: 'relative_name_telugu',  label: 'Relative (Te)', width: 140, telugu: true  },
  { key: 'relative_name_english', label: 'Relative (En)', width: 140              },
  { key: 'relation_type',         label: 'Rel',           width: 50               },
  { key: 'age',                   label: 'Age',           width: 50               },
  { key: 'gender',                label: 'Gender',        width: 90               },
  { key: 'epic_id',               label: 'EPIC ID',       width: 150, mono: true  },
  { key: 'assembly_name',         label: 'Assembly',      width: 110              },
  { key: 'part_no',               label: 'Part',          width: 55               },
  { key: 'polling_station_name',  label: 'Polling Station',width: 130             },
  { key: 'actions',               label: 'Actions',       width: 200, searchOnly: true  },
] as const

function MatchBadge({ type }: { type: string }) {
  return (
    <span className={`badge-${type?.toLowerCase() || 'possible'}`}>
      {type || 'POSSIBLE'}
    </span>
  )
}

function EngineBadge({ engine }: { engine: string }) {
  if (!engine) return null
  const isPython = engine === 'python'
  return (
    <span 
      title={isPython ? 'Extracted via Free Python Engine (Medium Accuracy)' : 'Extracted via AI Gemini (High Accuracy)'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginLeft: 6, padding: '2px 4px', borderRadius: 4, fontSize: 10, fontWeight: 700,
        backgroundColor: isPython ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        color: isPython ? '#22c55e' : 'var(--color-accent)',
        border: `1px solid ${isPython ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
        cursor: 'help'
      }}
    >
      {isPython ? '🐍 Free' : '🤖 AI'}
    </span>
  )
}

export function VoterTable({
  voters,
  isLoading,
  showMatchType,
  onSort,
  sortBy,
  sortDir,
  onViewFamily,
  userRole,
}: VoterTableProps) {
  const [internalSort, setInternalSort] = useState<{ col: string; dir: 'asc'|'desc' }>({
    col: 'house_no_normalized', dir: 'asc'
  })
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNameEn, setEditNameEn] = useState('')
  const [editNameTe, setEditNameTe] = useState('')
  const [editRelNameEn, setEditRelNameEn] = useState('')
  const [editRelNameTe, setEditRelNameTe] = useState('')
  const [editHouseNo, setEditHouseNo] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [auditVoter, setAuditVoter] = useState<{ sourcePdf: string, pageNo: number } | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      if (session?.user) {
        setAdminUserId(session.user.id)
      }
    })
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session)
      if (session?.user) {
        setAdminUserId(session.user.id)
      } else {
        setAdminUserId(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleEdit = (voter: Record<string, unknown>) => {
    setEditingId(voter.id as string)
    setEditNameEn((voter.voter_name_english as string) || '')
    setEditNameTe((voter.voter_name_telugu as string) || '')
    setEditRelNameEn((voter.relative_name_english as string) || '')
    setEditRelNameTe((voter.relative_name_telugu as string) || '')
    setEditHouseNo((voter.house_no as string) || '')
  }

  const handleSave = async (voter: Record<string, unknown>) => {
    setIsSaving(true)
    try {
      const is2002 = voter.source_table === 'voters_2002'
      const table = is2002 ? 'voters_2002' : 'voters'
      
      const newValues = {
        voter_name_english: editNameEn,
        voter_name_telugu: editNameTe,
        relative_name_english: editRelNameEn,
        relative_name_telugu: editRelNameTe,
        house_no: editHouseNo
      }

      // 1. Log the changes if any fields changed
      const changes: any[] = []
      for (const [key, newValue] of Object.entries(newValues)) {
        const oldValue = (voter as any)[key]
        if (oldValue !== newValue) {
          changes.push({
            voter_id: voter.id,
            admin_id: adminUserId,
            field_changed: key,
            old_value: String(oldValue || ''),
            new_value: String(newValue || '')
          })
        }
      }

      // Update the main voters table
      const { error: updateError } = await supabase
        .from(table)
        .update(newValues)
        .eq('id', voter.id)
        
      if (updateError) {
        console.error('Failed to update voter:', updateError)
        alert('Failed to update voter. Make sure you are an Admin.')
        return
      } 
      
      // Attempt to save logs (fail silently if table not created yet)
      if (changes.length > 0 && adminUserId) {
        try {
          await supabase.from('correction_log').insert(changes)
        } catch (err) {
          console.log('Correction log insert failed (expected if table not created)', err)
        }
      }

      // Optimistically update the local state without a full reload
      voter.voter_name_english = editNameEn
      voter.voter_name_telugu = editNameTe
      voter.relative_name_english = editRelNameEn
      voter.relative_name_telugu = editRelNameTe
      voter.house_no = editHouseNo
    } finally {
      setIsSaving(false)
      setEditingId(null)
    }
  }

  const handleSort = useCallback((col: string) => {
    if (col === 'actions') return
    if (onSort) {
      const newDir = sortBy === col && sortDir === 'asc' ? 'desc' : 'asc'
      onSort(col, newDir)
    } else {
      setInternalSort(prev => ({
        col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc',
      }))
    }
  }, [onSort, sortBy, sortDir])

  const activeSort = onSort ? { col: sortBy || '', dir: sortDir || 'asc' } : internalSort

  const displayedVoters = onSort ? voters : [...voters].sort((a, b) => {
    const ak = (a as Record<string, unknown>)[activeSort.col]
    const bk = (b as Record<string, unknown>)[activeSort.col]
    if (ak == null) return 1
    if (bk == null) return -1
    const cmp = ak < bk ? -1 : ak > bk ? 1 : 0
    return activeSort.dir === 'asc' ? cmp : -cmp
  })

  // If onViewFamily isn't provided AND user is not logged in, don't show the actions column
  let visibleColumns = COLUMNS.filter(c => showMatchType || !('searchOnly' in c && c.searchOnly))
  if (!onViewFamily && !isLoggedIn) {
    visibleColumns = visibleColumns.filter(c => c.key !== 'actions')
  }

  if (isLoading) {
    return (
      <div style={{ padding: 32 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8 }} />
        ))}
      </div>
    )
  }

  if (!voters.length) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}>No voters found</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Try a different search term or browse by part
        </div>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ minWidth: 1200 }}>
        <thead>
          <tr>
            {visibleColumns.map(col => (
              <th
                key={col.key}
                onClick={() => !('searchOnly' in col && col.searchOnly) && handleSort(col.key)}
                style={{
                  width: col.width,
                  minWidth: col.width,
                  cursor: ('searchOnly' in col && col.searchOnly) || col.key === 'actions' ? 'default' : 'pointer',
                  textAlign: col.key === 'actions' ? 'right' : 'left'
                }}
              >
                {col.label}
                {!('searchOnly' in col && col.searchOnly) && col.key !== 'actions' && activeSort.col === col.key && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    {activeSort.dir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayedVoters.map((voter, i) => {
            const v = voter as Record<string, unknown>
            const matchType = (v.match_type as string) || ''
            return (
              <tr key={v.id as string || i} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}>
                {showMatchType && (
                  <td><MatchBadge type={matchType} /></td>
                )}
                <td style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {v.serial_no as number}
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--color-accent-text)' }}>
                  {editingId === v.id ? (
                    <input 
                      type="text" 
                      value={editHouseNo} 
                      onChange={(e) => setEditHouseNo(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 4 }}
                    />
                  ) : (
                    v.house_no as string || '—'
                  )}
                </td>
                <td lang="te" className="telugu" style={{ color: 'var(--color-text-primary)' }}>
                  {editingId === v.id ? (
                    <input 
                      type="text" 
                      value={editNameTe} 
                      onChange={(e) => setEditNameTe(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 4 }}
                    />
                  ) : (
                    v.voter_name_telugu as string || '—'
                  )}
                </td>
                <td style={{ fontWeight: 500 }}>
                  {editingId === v.id ? (
                    <input 
                      type="text" 
                      value={editNameEn} 
                      onChange={(e) => setEditNameEn(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 4 }}
                    />
                  ) : (
                    v.voter_name_english as string || '—'
                  )}
                </td>
                <td lang="te" className="telugu" style={{ color: 'var(--color-text-secondary)' }}>
                  {editingId === v.id ? (
                    <input 
                      type="text" 
                      value={editRelNameTe} 
                      onChange={(e) => setEditRelNameTe(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 4 }}
                    />
                  ) : (
                    v.relative_name_telugu as string || '—'
                  )}
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  {editingId === v.id ? (
                    <input 
                      type="text" 
                      value={editRelNameEn} 
                      onChange={(e) => setEditRelNameEn(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 4 }}
                    />
                  ) : (
                    v.relative_name_english as string || '—'
                  )}
                </td>
                <td style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  {v.relation_type as string || '—'}
                </td>
                <td style={{ textAlign: 'center' }}>{v.age as number || '—'}</td>
                <td>
                  <GenderBadge gender={v.gender as string} />
                </td>
                <td style={{
                  fontFamily: 'monospace', fontSize: 12,
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.5px',
                }}>
                  {v.epic_id as string || '—'}
                </td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                  {v.assembly_name as string || '—'}
                </td>
                <td style={{ textAlign: 'center', color: 'var(--color-accent-text)' }}>
                  {v.part_no as number}
                </td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {v.polling_station_name as string || '—'}
                </td>
                {(onViewFamily || isLoggedIn) && (
                  <td style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                    
                    {/* VERIFY BUTTON (Available to ALL logged-in users) */}
                    {isLoggedIn && v.source_pdf && v.page_no ? (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '4px 8px', color: '#f59e0b' }}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setAuditVoter({ sourcePdf: v.source_pdf as string, pageNo: v.page_no as number });
                        }}
                        title="Verify extracted data against original PDF"
                      >
                        👁️ View PDF
                      </button>
                    ) : null}

                    {/* EDIT CONTROLS (Admins only) */}
                    {(userRole === 'admin' || userRole === 'super-admin') && (
                      <>
                        {editingId === v.id ? (
                          <>
                            <button
                              className="btn-ghost"
                              style={{ fontSize: 11, padding: '4px 8px', color: '#10b981', fontWeight: 'bold' }}
                              onClick={(e) => { e.stopPropagation(); handleSave(v); }}
                              disabled={isSaving}
                            >
                              {isSaving ? '...' : '💾 Save'}
                            </button>
                            <button
                              className="btn-ghost"
                              style={{ fontSize: 11, padding: '4px 8px', color: '#ef4444' }}
                              onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                            >
                              ✕ Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-ghost"
                            style={{ fontSize: 11, padding: '4px 8px', color: '#8b5cf6' }}
                            onClick={(e) => { e.stopPropagation(); handleEdit(v); }}
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </>
                    )}
                    {onViewFamily && v.house_no_normalized != null && v.part_no && isValidHouseNo(v.house_no as string) ? (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '4px 8px', color: 'var(--color-accent)' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewFamily(v.house_no_normalized as number, v.part_no as number, v.house_no as string)
                        }}
                      >
                        👥 Family
                      </button>
                    ) : null}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {auditVoter && (
        <AuditViewModal 
          sourcePdf={auditVoter.sourcePdf} 
          pageNo={auditVoter.pageNo} 
          onClose={() => setAuditVoter(null)} 
        />
      )}
    </div>
  )
}

function GenderBadge({ gender }: { gender: string | null }) {
  if (!gender) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>
  const isFemale = gender.includes('స్త్రీ') || gender.toLowerCase().includes('f')
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: isFemale ? 'rgba(236,72,153,0.12)' : 'rgba(59,130,246,0.12)',
      color: isFemale ? '#ec4899' : '#60a5fa',
      border: `1px solid ${isFemale ? 'rgba(236,72,153,0.3)' : 'rgba(59,130,246,0.3)'}`,
    }}>
      {isFemale ? '♀ Female' : '♂ Male'}
    </span>
  )
}

function isValidHouseNo(houseNo: string | null | undefined): boolean {
  if (!houseNo) return false
  const clean = houseNo.trim()
  if (clean === '-' || clean === '0' || clean.toUpperCase() === 'NA' || clean === '') return false
  return true
}
