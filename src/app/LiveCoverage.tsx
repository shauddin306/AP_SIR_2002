'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function LiveCoverage() {
  const [stats, setStats] = useState({ assemblies: 0, parts: 0, voters: 0 });

  useEffect(() => {
    async function fetchStats() {
      // Fetch all processed parts to get global stats
      const { data, error } = await supabase.from('voter_parts').select('assembly_no, voter_count');
      if (!error && data) {
        const uniqueAssemblies = new Set(data.map((r: any) => r.assembly_no)).size;
        const totalParts = data.length;
        const totalVoters = data.reduce((sum: number, r: any) => sum + (r.voter_count || 0), 0);
        
        setStats({
          assemblies: uniqueAssemblies,
          parts: totalParts,
          voters: totalVoters
        });
      }
    }
    fetchStats();
    // Poll every 15 seconds to auto-update as the cluster finishes new parts
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  // Format number with commas (e.g. 1,450,000)
  const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);

  const isLoaded = stats.parts > 0;

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
          <strong style={{ color: '#fff' }}>Live Coverage:</strong>{' '}
          {isLoaded ? (
            <>
              {stats.assemblies} Assemblies Indexed • {formatNumber(stats.parts)} Parts • <strong>{formatNumber(stats.voters)}+ Voter Records</strong>
            </>
          ) : (
            "Syncing state-wide database..."
          )}
          <a href="/browse" style={{ color: '#fff', marginLeft: 12, textDecoration: 'underline', fontWeight: 600 }}>Explore Directory &rarr;</a>
        </span>
      </div>
    </div>
  );
}
