'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function LiveCoverage() {
  const [parts, setParts] = useState<number[]>([]);

  useEffect(() => {
    async function fetchParts() {
      // Fetch dynamic available parts using the RPC we created
      const { data, error } = await supabase.rpc('get_available_parts', { p_assembly_no: 152 });
      if (!error && data) {
        setParts(data.map((r: any) => r.part_no));
      }
    }
    fetchParts();
    // Poll every 10 seconds to auto-update as the Mac finishes parts
    const interval = setInterval(fetchParts, 10000);
    return () => clearInterval(interval);
  }, []);

  const coverageText = parts.length > 0 
    ? `Parts ${parts.slice(0, 8).join(', ')}${parts.length > 8 ? '...' : ''} (${parts.length} total)`
    : "Loading parts from database...";

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40, marginTop: 40 }}>
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '8px 24px',
        borderRadius: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <span className="live-dot" style={{ display: 'inline-block', width: 8, height: 8, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></span>
        <span style={{ color: '#93c5fd', fontSize: 14, fontWeight: 500 }}>
          <strong style={{ color: '#fff' }}>Live Coverage:</strong> Rayachoty Assembly (2002 Electoral Roll) — {coverageText}
          <a href="/browse" style={{ color: '#fff', marginLeft: 8, textDecoration: 'underline', fontWeight: 600 }}>View Full Directory &rarr;</a>
        </span>
      </div>
    </div>
  );
}
