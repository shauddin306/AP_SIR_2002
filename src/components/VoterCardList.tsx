import React, { useState } from 'react';
import { Voter } from '@/types';
import { AuditViewModal } from './AuditViewModal';

interface VoterCardListProps {
  voters: Voter[];
  onViewFamily: (voter: Voter) => void;
}

export function VoterCardList({ voters, onViewFamily }: VoterCardListProps) {
  const [auditVoter, setAuditVoter] = useState<{sourcePdf: string, pageNo: number} | null>(null);

  if (!voters || voters.length === 0) return null;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {voters.map((voter, index) => (
          <VoterCard 
            key={voter.id || index} 
            voter={voter} 
            onViewAudit={() => {
              if (voter.source_pdf && voter.page_no) {
                setAuditVoter({ sourcePdf: voter.source_pdf, pageNo: voter.page_no })
              } else {
                alert('No PDF available for this record');
              }
            }}
            onViewFamily={() => onViewFamily(voter)}
          />
        ))}
      </div>

      {auditVoter && (
        <AuditViewModal 
          sourcePdf={auditVoter.sourcePdf} 
          pageNo={auditVoter.pageNo} 
          onClose={() => setAuditVoter(null)} 
        />
      )}
    </>
  );
}

function VoterCard({ voter, onViewAudit, onViewFamily }: { voter: Voter, onViewAudit: () => void, onViewFamily: () => void }) {
  const isExact = voter.match_type === 'EXACT';
  const isClose = voter.match_type === 'CLOSE';

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 16,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
            {((voter as any).voter_name_english || (voter as any).voter_name_en) as string}
          </div>
          {((voter as any).voter_name_telugu || (voter as any).voter_name_te) && (
            <div style={{ fontSize: 15, color: '#cbd5e1' }}>
              {((voter as any).voter_name_telugu || (voter as any).voter_name_te) as string}
            </div>
          )}
        </div>
        
        {/* Match Badge */}
        {voter.match_type && (
          <div style={{
            background: isExact ? 'rgba(16, 185, 129, 0.15)' : isClose ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 163, 184, 0.15)',
            color: isExact ? '#34d399' : isClose ? '#fbbf24' : '#cbd5e1',
            border: `1px solid ${isExact ? 'rgba(16, 185, 129, 0.3)' : isClose ? 'rgba(245, 158, 11, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
            padding: '4px 8px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.5px'
          }}>
            {voter.match_type}
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, color: '#94a3b8' }}>
        <div>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>House No</span>
          <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{((voter as any).house_no || (voter as any).house_no_raw) || '-'}</div>
        </div>
        <div>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Relative</span>
          <div style={{ color: '#e2e8f0' }}>{((voter as any).relative_name_english || (voter as any).relative_name_telugu || (voter as any).relative_name_en) || '-'}</div>
        </div>
        <div>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Age / Gender</span>
          <div style={{ color: '#e2e8f0' }}>{voter.age || '-'} / {((voter as any).gender || (voter as any).gender_en || (voter as any).gender_te) || '-'}</div>
        </div>
        <div>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>EPIC ID</span>
          <div style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>
            {voter.epic_id ? `${voter.epic_id.substring(0, 3)}***${voter.epic_id.slice(-3)}` : '-'}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.05)', margin: '4px 0' }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button 
          onClick={onViewAudit}
          style={{ flex: 1, padding: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', borderRadius: 8, fontWeight: 600, fontSize: 14 }}
        >
          View Details
        </button>
        <button 
          onClick={onViewFamily}
          style={{ flex: 1, padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 14 }}
        >
          Family Search
        </button>
      </div>
    </div>
  );
}
