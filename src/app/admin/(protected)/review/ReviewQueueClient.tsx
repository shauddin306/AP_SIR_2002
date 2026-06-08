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
  status: string
  voters?: {
    epic_id: string
    house_no: string
  }
}

export function ReviewQueueClient({ adminUserId }: { adminUserId: string }) {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchQueue = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('voter_staging_queue')
      .select('*, voters(epic_id, house_no)')
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
    // 1. Update the live voters table
    const { error: updateError } = await supabase
      .from('voters')
      .update({
        voter_name_english: item.ocr_voter_name_english,
        voter_name_telugu: item.ocr_voter_name_telugu
      })
      .eq('id', item.voter_id)

    if (updateError) {
      alert('Failed to update live table')
      return
    }

    // 2. Mark queue item as approved
    await supabase
      .from('voter_staging_queue')
      .update({ status: 'APPROVED', reviewer_id: adminUserId, reviewed_at: new Date().toISOString() })
      .eq('id', item.id)

    // 3. Log it
    const logEntries = []
    if (item.db_voter_name_english !== item.ocr_voter_name_english) {
      logEntries.push({
        voter_id: item.voter_id,
        admin_id: adminUserId,
        field_changed: 'voter_name_english',
        old_value: item.db_voter_name_english,
        new_value: item.ocr_voter_name_english
      })
    }
    if (item.db_voter_name_telugu !== item.ocr_voter_name_telugu) {
      logEntries.push({
        voter_id: item.voter_id,
        admin_id: adminUserId,
        field_changed: 'voter_name_telugu',
        old_value: item.db_voter_name_telugu,
        new_value: item.ocr_voter_name_telugu
      })
    }
    if (logEntries.length > 0) {
      try {
        await supabase.from('correction_log').insert(logEntries)
      } catch (err) {
        console.error(err)
      }
    }

    setItems(items.filter(i => i.id !== item.id))
  }

  const handleReject = async (item: ReviewItem) => {
    await supabase
      .from('voter_staging_queue')
      .update({ status: 'REJECTED', reviewer_id: adminUserId, reviewed_at: new Date().toISOString() })
      .eq('id', item.id)

    setItems(items.filter(i => i.id !== item.id))
  }

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
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', minWidth: 800 }}>
          <thead>
            <tr>
              <th>PDF Source</th>
              <th>Voter Details</th>
              <th>Current DB Value</th>
              <th>Proposed OCR Value</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  {item.source_pdf} <br/>
                  <span style={{ fontSize: 12 }}>Page {item.page_no}</span>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-accent-text)' }}>EPIC: {item.voters?.epic_id}</span><br/>
                  <span style={{ fontSize: 13 }}>House: {item.voters?.house_no}</span>
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
