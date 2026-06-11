'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export function MobileMenu({ user }: { user: { email?: string } | null }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(8, 12, 20, 0.98)',
          backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column',
          padding: '24px',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontSize: 20, fontWeight: 600 }}>
            {user ? (
              <>
                <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8, fontWeight: 400 }}>Logged in as {user.email}</div>
                <Link href="/admin/dashboard" onClick={() => setIsOpen(false)} style={{ color: 'white', textDecoration: 'none' }}>Admin Dashboard</Link>
                <Link href="/admin/review" onClick={() => setIsOpen(false)} style={{ color: 'white', textDecoration: 'none' }}>Review Queue</Link>
                <Link href="/admin/history" onClick={() => setIsOpen(false)} style={{ color: 'white', textDecoration: 'none' }}>History</Link>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
                <button onClick={handleLogout} style={{ textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', fontSize: 20, fontWeight: 600, padding: 0, cursor: 'pointer' }}>
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/admin/login" onClick={() => setIsOpen(false)} style={{ color: '#60a5fa', textDecoration: 'none' }}>Admin Login</Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
