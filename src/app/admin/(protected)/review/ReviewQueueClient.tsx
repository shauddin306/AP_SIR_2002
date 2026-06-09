'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'

type ReviewItem = {
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
  status: string
  db_epic_id?: string;
  db_house_no?: string;
  ocr_epic_id?: string;
  ocr_house_no?: string;
  created_at?: string;
}

export function ReviewQueueClient({ adminUserId }: { adminUserId: string }) {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [partFilter, setPartFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date')
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchQueue = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('voter_staging_queue')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(100)
      
    if (data) setItems(data as ReviewItem[])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  const handleApprove = async (item: ReviewItem) => {
    // Collect all valid updates
    const updates: Record<string, string> = {};
    if (item.ocr_voter_name_english) updates.voter_name_english = item.ocr_voter_name_english;
    if (item.ocr_voter_name_telugu) updates.voter_name_telugu = item.ocr_voter_name_telugu;
    if (item.ocr_relative_name_english) updates.relative_name_english = item.ocr_relative_name_english;
    if (item.ocr_relative_name_telugu) updates.relative_name_telugu = item.ocr_relative_name_telugu;
    if (item.ocr_epic_id && item.ocr_epic_id !== item.db_epic_id) updates.epic_id = item.ocr_epic_id;
    if (item.ocr_house_no && item.ocr_house_no !== item.db_house_no) updates.house_no = item.ocr_house_no;

    if (Object.keys(updates).length === 0) {
      alert('No updates to apply');
      return;
    }

    try {
      const res = await fetch('/api/admin/approve-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue_id: item.id,
          voter_id: item.voter_id,
          admin_id: adminUserId,
          updates: updates
        })
      });

      if (!res.ok) {
        throw new Error('Failed to approve correction');
      }

      setItems(prev => prev.filter(i => i.id !== item.id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    } catch (err) {
      console.error(err);
      alert('Error approving correction. Check console.');
    }
  }

  const handleReject = async (item: ReviewItem) => {
    await supabase
      .from('voter_staging_queue')
      .update({ status: 'REJECTED', reviewer_id: adminUserId, reviewed_at: new Date().toISOString() })
      .eq('id', item.id)

    setItems(prev => prev.filter(i => i.id !== item.id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(item.id);
      return newSet;
    });
  }

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
      // Default: date descending
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredAndSortedItems.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    // Simple loop for bulk approve
    for (const item of selectedItems) {
      await handleApprove(item);
    }
    setSelectedIds(new Set());
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    for (const item of selectedItems) {
      await handleReject(item);
    }
    setSelectedIds(new Set());
  };

  if (isLoading) return <div>Loading queue...</div>

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
        <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Queue is empty</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
          No offline OCR corrections pending review.
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
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Pending Reviews</h3>
          
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
              <option value="all">All Parts ({items.length})</option>
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
              <option value="date">Date Added (Newest)</option>
              <option value="part">Part Number</option>
              <option value="page">Page Number</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleBulkReject}
            disabled={selectedIds.size === 0}
            style={{ opacity: selectedIds.size === 0 ? 0.5 : 1, color: '#ef4444' }}>
            Reject Selected ({selectedIds.size})
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleBulkApprove}
            disabled={selectedIds.size === 0}
            style={{ opacity: selectedIds.size === 0 ? 0.5 : 1 }}>
            Approve Selected ({selectedIds.size})
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={filteredAndSortedItems.length > 0 && selectedIds.size === filteredAndSortedItems.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>PDF Source</th>
              <th>Voter Details</th>
              <th>Current DB Value</th>
              <th>Proposed OCR Value</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedItems.map(item => (
              <tr key={item.id}>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(item.id)}
                    onChange={() => handleToggleSelect(item.id)}
                  />
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  {item.source_pdf} <br/>
                  <span style={{ fontSize: 12 }}>Page {item.page_no}</span>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>EPIC: </span>
                    <span style={{ color: '#ef4444', textDecoration: item.db_epic_id !== item.ocr_epic_id ? 'line-through' : 'none', marginRight: 4 }}>
                      {item.db_epic_id || 'N/A'}
                    </span>
                    {item.db_epic_id !== item.ocr_epic_id && (
                      <span style={{ color: '#10b981', fontWeight: 500 }}>{item.ocr_epic_id}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>House: </span>
                    <span style={{ color: '#ef4444', textDecoration: item.db_house_no !== item.ocr_house_no ? 'line-through' : 'none', marginRight: 4 }}>
                      {item.db_house_no || 'N/A'}
                    </span>
                    {item.db_house_no !== item.ocr_house_no && (
                      <span style={{ color: '#10b981', fontWeight: 500 }}>{item.ocr_house_no}</span>
                    )}
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  <div style={{ color: '#ef4444', textDecoration: 'line-through' }}>
                    {item.db_voter_name_english}
                  </div>
                  <div style={{ color: '#ef4444', textDecoration: 'line-through', fontFamily: 'Noto Sans Telugu, sans-serif' }}>
                    {item.db_voter_name_telugu}
                  </div>
                </td>
                <td style={{ color: 'var(--color-accent-text)' }}>
                  <div style={{ color: '#10b981', fontWeight: 600 }}>
                    {item.ocr_voter_name_english}
                  </div>
                  <div style={{ color: '#10b981', fontWeight: 600, fontFamily: 'Noto Sans Telugu, sans-serif' }}>
                    {item.ocr_voter_name_telugu}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="btn-primary" 
                    style={{ background: '#10b981', marginRight: 8, padding: '6px 12px', fontSize: 13 }}
                    onClick={() => handleApprove(item)}
                  >
                    Approve
                  </button>
                  <button 
                    className="btn-ghost" 
                    style={{ color: '#ef4444', padding: '6px 12px', fontSize: 13 }}
                    onClick={() => handleReject(item)}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
