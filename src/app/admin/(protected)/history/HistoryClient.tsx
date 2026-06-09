'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'

type HistoryItem = {
  id: string
  voter_id: string
  source_pdf: string
  page_no: number
  db_voter_name_english: string
  db_voter_name_telugu: string
  ocr_voter_name_english: string
  ocr_voter_name_telugu: string
  ocr_relative_name_english?: string
  ocr_relative_name_telugu?: string
  db_relative_name_english?: string
  db_relative_name_telugu?: string
  status: string
  db_epic_id?: string;
  db_house_no?: string;
  ocr_epic_id?: string;
  ocr_house_no?: string;
  reviewer_id?: string;
  reviewed_at?: string;
  created_at?: string;
}

export function HistoryClient({ adminUserId }: { adminUserId: string }) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [partFilter, setPartFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date')
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchHistory = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('voter_staging_queue')
      .select('*')
      .in('status', ['APPROVED', 'REJECTED'])
      .order('reviewed_at', { ascending: false })
      .limit(200)
      
    if (data) setItems(data as HistoryItem[])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const getPartNumber = (pdfName: string): number => {
    const match = pdfName.match(/^(\d+)_(\d+)_/);
    return match ? parseInt(match[2], 10) : 9999;
  };

  const uniqueParts = Array.from(
    new Set(
      items
        .map(item => {
          const match = item.source_pdf.match(/^(\d+)_(\d+)_/);
          return match ? match[2] : null;
        })
        .filter((x): x is string => x !== null)
    )
  ).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const filteredAndSortedItems = items
    .filter(item => {
      // Status Filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      
      // Part Filter
      if (partFilter === 'all') return true;
      const match = item.source_pdf.match(/^(\d+)_(\d+)_/);
      return match ? match[2] === partFilter : false;
    })
    .sort((a, b) => {
      if (sortBy === 'part') {
        const partA = getPartNumber(a.source_pdf);
        const partB = getPartNumber(b.source_pdf);
        if (partA !== partB) return partA - partB;
        return a.page_no - b.page_no;
      }
      if (sortBy === 'page') {
        if (a.page_no !== b.page_no) return a.page_no - b.page_no;
        const partA = getPartNumber(a.source_pdf);
        const partB = getPartNumber(b.source_pdf);
        return partA - partB;
      }
      // Default: Date Reviewed (newest first)
      return new Date(b.reviewed_at || 0).getTime() - new Date(a.reviewed_at || 0).getTime();
    });

  if (isLoading) return <div style={{ color: 'var(--color-text-secondary)' }}>Loading history...</div>

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>No history available</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
          No corrections have been approved or rejected yet.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid var(--color-border)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Processed History</h3>
          
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                padding: '6px 12px',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All ({items.length})</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Part Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Part:</span>
            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
              style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                padding: '6px 12px',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Parts</option>
              {uniqueParts.map(part => (
                <option key={part} value={part}>Part {part}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                padding: '6px 12px',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="date">Date Reviewed (Newest)</option>
              <option value="part">Part Number</option>
              <option value="page">Page Number</option>
            </select>
          </div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', minWidth: 800 }}>
          <thead>
            <tr>
              <th>PDF Source</th>
              <th>Voter Details</th>
              <th>Original DB Value</th>
              <th>Proposed OCR Value</th>
              <th>Status</th>
              <th>Reviewed By</th>
              <th style={{ textAlign: 'right' }}>Reviewed At</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedItems.map(item => (
              <tr key={item.id}>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  {item.source_pdf} <br/>
                  <span style={{ fontSize: 12 }}>Page {item.page_no}</span>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>EPIC: </span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{item.db_epic_id || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>House: </span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{item.db_house_no || 'N/A'}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  <div style={{ textDecoration: item.status === 'APPROVED' ? 'line-through' : 'none', opacity: item.status === 'APPROVED' ? 0.7 : 1 }}>
                    {item.db_voter_name_english}
                  </div>
                  <div style={{ textDecoration: item.status === 'APPROVED' ? 'line-through' : 'none', opacity: item.status === 'APPROVED' ? 0.7 : 1, fontFamily: 'Noto Sans Telugu, sans-serif' }}>
                    {item.db_voter_name_telugu}
                  </div>
                  {item.db_relative_name_telugu && (
                    <div style={{ fontSize: 11, marginTop: 4, textDecoration: item.status === 'APPROVED' ? 'line-through' : 'none', opacity: 0.6, fontFamily: 'Noto Sans Telugu, sans-serif' }}>
                      Rel: {item.db_relative_name_telugu}
                    </div>
                  )}
                </td>
                <td style={{ color: 'var(--color-accent-text)' }}>
                  <div style={{ fontWeight: 600, color: item.status === 'APPROVED' ? '#10b981' : '#cbd5e1' }}>
                    {item.ocr_voter_name_english || '—'}
                  </div>
                  <div style={{ fontWeight: 600, color: item.status === 'APPROVED' ? '#10b981' : '#cbd5e1', fontFamily: 'Noto Sans Telugu, sans-serif' }}>
                    {item.ocr_voter_name_telugu}
                  </div>
                  {item.ocr_relative_name_telugu && (
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: item.status === 'APPROVED' ? '#10b981' : '#cbd5e1', opacity: 0.8, fontFamily: 'Noto Sans Telugu, sans-serif' }}>
                      Rel: {item.ocr_relative_name_telugu}
                    </div>
                  )}
                </td>
                <td>
                  {item.status === 'APPROVED' ? (
                    <span className="badge-exact">Approved</span>
                  ) : (
                    <span className="badge-possible" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.3)' }}>Rejected</span>
                  )}
                </td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                  {item.reviewer_id ? `${item.reviewer_id.slice(0, 4)}...${item.reviewer_id.slice(-4)}` : '—'}
                </td>
                <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
