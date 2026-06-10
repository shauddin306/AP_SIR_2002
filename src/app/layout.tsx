import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voter Search SIR AP — Election Commission Voter List Engine',
  description: 'AI-powered voter list extraction, storage, and intelligent search engine for Election Commission of India Andhra Pradesh voter PDFs. Search by name, EPIC ID, house number in Telugu or English.',
  keywords: 'voter list, Andhra Pradesh, Election Commission, voter ID, EPIC, Telugu, voter search',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <div id="app-root" className="min-h-screen flex flex-col">
          <TopNav />
          <main className="flex-1">
            {children}
          </main>
          <GlobalFooter />
        </div>
      </body>
    </html>
  )
}

function GlobalFooter() {
  return (
    <footer style={{
      marginTop: 'auto',
      background: 'rgba(8,12,20,0.95)',
      borderTop: '1px solid var(--color-border)',
      padding: '40px 24px',
      color: 'var(--color-text-secondary)',
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Main Branding */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '0.5px' }}>
            Powered by MindT Private Limited
          </h2>
          <p style={{ fontSize: 14, fontStyle: 'italic', color: '#94a3b8', marginTop: 8 }}>
            "Empowering communities through technology. Serving the people, building the future."
          </p>
          <a href="https://mindt.co.in" target="_blank" rel="noopener noreferrer" style={{ 
            display: 'inline-block', marginTop: 12, fontSize: 14, fontWeight: 600, color: 'var(--color-accent-text)',
            textDecoration: 'none', borderBottom: '1px solid rgba(147, 197, 253, 0.4)', paddingBottom: 2
          }}>
            Visit mindt.co.in ↗
          </a>
        </div>

        <div style={{ width: 40, height: 2, background: 'var(--gradient-brand)', margin: '8px auto', borderRadius: 2 }} />

        {/* Product Advertisement */}
        <div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Discover our flagship enterprise ecosystem:
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <a href="https://mandigrow.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <span style={{ background: 'rgba(16,185,129,0.1)', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', display: 'inline-block', transition: 'all 0.2s', cursor: 'pointer' }}>
                📈 MandiGrow
              </span>
            </a>
          </div>
          <p style={{ fontSize: 12, marginTop: 12, color: 'var(--color-text-muted)' }}>
            The ultimate ERP and growth engine for modern agriculture, wholesale, and large-scale data management.
          </p>
        </div>

        <div style={{ width: '100%', height: 1, background: 'var(--color-border)', margin: '16px 0', opacity: 0.5 }} />

        {/* Legal & Compliance Disclaimer */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: 'var(--color-text-secondary)' }}>Legal Disclaimer:</strong> MindT is an independent technology and analytics company. All voter data indexed on this platform is extracted via Artificial Intelligence (OCR) from publicly available historical electoral rolls originally published by the government. <strong>MindT Private Limited is NOT affiliated with, endorsed by, or operated by the Election Commission of India.</strong> We do not guarantee the 100% accuracy of AI-extracted records. Users must verify all official information directly at <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>voters.eci.gov.in</a>.
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, justifyContent: 'center' }}>
            <a href="/legal/terms" style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>Terms of Service</a>
            <a href="/legal/privacy" style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>Privacy Policy</a>
          </div>
        </div>

      </div>
    </footer>
  )
}

import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/LogoutButton'

async function TopNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header style={{
      background: 'transparent',
      position: 'absolute',
      width: '100%',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px' }}>
        <div className="nav-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
          
          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Ballot Box Outline */}
              <rect x="3" y="10" width="18" height="12" rx="2" stroke="var(--color-accent)" strokeWidth="2" />
              <path d="M3 14H21" stroke="var(--color-accent)" strokeWidth="2" />
              {/* Ballot Paper dropping in */}
              <path d="M15 10V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V10" fill="#f8fafc" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
              {/* Checkmark on paper */}
              <path d="M10.5 6.5L12 8L13.5 5" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc', letterSpacing: '-0.3px' }}>
              Voter Search India
            </div>
          </a>

          {/* Centered Nav */}
          <nav className="nav-links" style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
            <NavLink href="/" label="Home" />
            <NavLink href="/search" label="Search" />
            <NavLink href="/browse" label="Directory" />
          </nav>

          {/* Right Action */}
          <div className="nav-right" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            {user ? (
              <>
                <a href="/admin/dashboard" style={{
                  color: 'var(--color-accent-text)', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                  opacity: 0.9, transition: 'opacity 0.2s'
                }} className="hover:opacity-100">
                  Dashboard
                </a>
                <a href="/admin/review" style={{
                  color: 'var(--color-accent-text)', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                  opacity: 0.9, transition: 'opacity 0.2s', marginLeft: 8
                }} className="hover:opacity-100">
                  Review Queue
                </a>
                <a href="/admin/history" style={{
                  color: 'var(--color-accent-text)', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                  opacity: 0.9, transition: 'opacity 0.2s', marginLeft: 16
                }} className="hover:opacity-100">
                  History
                </a>
                <LogoutButton />
              </>
            ) : (
              <a href="/admin/login" style={{
                border: '1px solid rgba(255,255,255,0.2)', padding: '6px 24px', borderRadius: 20,
                color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 500,
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
                transition: 'all 0.2s'
              }}>
                Admin Login
              </a>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="nav-link"
      style={{
        padding: '6px 8px',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 500,
        transition: 'color 0.2s ease'
      }}
    >
      {label}
    </a>
  )
}
