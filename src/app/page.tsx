import { Metadata } from 'next'
import HomeSearchClient from './HomeSearchClient'
import LiveCoverage from './LiveCoverage'

export const metadata: Metadata = {
  title: 'Voter Search India — Private AI Voter Engine',
  description: 'Search India voter lists intelligently. Find any voter by name, EPIC ID, house number with AI-powered matching.',
}

export default function HomePage() {
  return (
    <div className="mesh-background" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      {/* Mesh glowing orbs */}
      <div className="mesh-glow-saffron" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '120px 24px 60px' }}>
        
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 24px',
            borderRadius: '100px',
            background: 'linear-gradient(90deg, rgba(59,130,246,0.1) 0%, rgba(16,185,129,0.1) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 0 20px rgba(59,130,246,0.15)',
            marginBottom: 24
          }}>
            <p style={{
              fontSize: 13,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '3px',
              background: 'linear-gradient(90deg, #60a5fa, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              Powered by MindT Private Limited
            </p>
          </div>
          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 68px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-1px',
            marginBottom: 20,
            color: '#f8fafc',
            textShadow: '0 4px 24px rgba(0,0,0,0.5)'
          }}>
            FIND ANY VOTER<br />IN SECONDS
          </h1>
          
          <p style={{
            fontSize: 18, color: '#cbd5e1',
            maxWidth: 680, margin: '0 auto', lineHeight: 1.6,
            fontWeight: 400
          }}>
            Search through the historic 2002 registered voter lists in India quickly and accurately with our AI-powered platform. Fast, reliable, and user-friendly.
          </p>
        </div>

        {/* Coverage Flash Note */}
        <LiveCoverage />

        {/* Search Area */}
        <div style={{ marginBottom: 80 }}>
          <HomeSearchClient />
        </div>

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 80 }}>
          <FeatureCard
            iconLeft={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
            iconRight={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            title="Lightning-Fast Search"
            desc="Search millions of voter records instantly. Built on a heavily optimized indexing engine."
          />
          <FeatureCard
            iconLeft={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>}
            iconRight={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 5.52 4.48 10 10 10s10-4.48 10-10A10 10 0 0 0 12 2z"/><path d="M12 6v12M8 10v4M16 10v4"/></svg>}
            title="Advanced Fuzzy Matching"
            desc="Our AI natively understands Telugu transliteration, finding matches even if names are misspelled."
          />
          <FeatureCard
            iconLeft={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            iconRight={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 9"/></svg>}
            title="Data Extraction Accuracy"
            desc="Historic 2002 voter lists extracted using cutting-edge OCR and AI parsing algorithms."
          />
          <FeatureCard
            iconLeft={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            iconRight={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            title="Door-to-Door Details"
            desc="Search your data, door-to-door details for these needs."
          />
          <FeatureCard
            iconLeft={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>}
            iconRight={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>}
            title="Comprehensive Filters"
            desc="Search through filters and pillars, comprehensive matching filters."
          />
          <FeatureCard
            iconLeft={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            iconRight={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            title="Data Security"
            desc="Reconnaissance and data security and protection tools."
          />
        </div>

        {/* Bottom Section */}
        <div style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: '40px 48px',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(3,7,18,0.8) 100%)',
          display: 'flex',
          gap: 40,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1 1 400px' }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc', marginBottom: 16 }}>
              AI-POWERED SEARCH<br/>FOR INDIA
            </h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 15 }}>
              Search through millions of registered voters in India quickly and accurately with our AI-powered platform. Fast indexing and structured results built for scale.
            </p>
          </div>
          <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'relative', width: 450, height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              
              <img 
                src="/india-map.svg" 
                alt="India Map" 
                style={{
                  width: '90%', height: '90%', objectFit: 'contain',
                  filter: 'invert(100%) sepia(100%) saturate(150%) hue-rotate(180deg) brightness(90%) drop-shadow(0 0 20px rgba(59,130,246,0.4)) opacity(0.8)',
                  position: 'relative',
                  zIndex: 2
                }} 
              />

              {/* Floating Node 1: Top Left */}
              <div className="card-glass" style={{ position: 'absolute', top: 60, left: -20, padding: '12px 16px', borderRadius: 12, zIndex: 3, display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }}></div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>4</span>
                </div>
                <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ width: '60%', height: '100%', background: '#3b82f6', borderRadius: 2 }}></div>
                </div>
                <div style={{ width: 60, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}></div>
              </div>

              {/* Floating Node 2: Top Right */}
              <div className="card-glass" style={{ position: 'absolute', top: 40, right: -10, padding: '12px 16px', borderRadius: 12, zIndex: 3, display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }}></div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>4</span>
                </div>
                <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ width: '75%', height: '100%', background: '#10b981', borderRadius: 2 }}></div>
                </div>
                <div style={{ width: 40, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}></div>
              </div>

              {/* Floating Node 3: Bottom Left */}
              <div className="card-glass" style={{ position: 'absolute', bottom: 60, left: 20, padding: '12px 16px', borderRadius: 12, zIndex: 3, display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }}></div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>5010</span>
                </div>
                <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ width: '40%', height: '100%', background: '#f97316', borderRadius: 2 }}></div>
                </div>
                <div style={{ width: 50, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}></div>
              </div>

              {/* Floating Node 4: Bottom Right */}
              <div className="card-glass" style={{ position: 'absolute', bottom: 10, right: 20, padding: '12px 16px', borderRadius: 12, zIndex: 3, display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }}></div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Nodes</span>
                </div>
                <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ width: '85%', height: '100%', background: '#3b82f6', borderRadius: 2 }}></div>
                </div>
                <div style={{ width: 70, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}></div>
              </div>

              {/* Glowing Dots on Map */}
              <div style={{ position: 'absolute', top: 120, left: 160, width: 8, height: 8, background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 12px 2px #3b82f6', zIndex: 4 }}></div>
              <div style={{ position: 'absolute', top: 150, right: 120, width: 8, height: 8, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 12px 2px #10b981', zIndex: 4 }}></div>
              <div style={{ position: 'absolute', bottom: 180, left: 140, width: 8, height: 8, background: '#f97316', borderRadius: '50%', boxShadow: '0 0 12px 2px #f97316', zIndex: 4 }}></div>
              <div style={{ position: 'absolute', bottom: 110, right: 160, width: 8, height: 8, background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 12px 2px #3b82f6', zIndex: 4 }}></div>

              {/* Connecting Lines (Simulated using CSS borders) */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, opacity: 0.3 }} pointerEvents="none">
                <line x1="160" y1="120" x2="60" y2="80" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="330" y1="150" x2="430" y2="60" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="140" y1="270" x2="60" y2="380" stroke="#f97316" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="290" y1="340" x2="400" y2="400" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function FeatureCard({ iconLeft, iconRight, title, desc }: { iconLeft: React.ReactNode; iconRight: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="mockup-feature-card">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <linearGradient id="icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 12, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)' }}>
          {iconLeft}
        </div>
        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {iconRight}
        </div>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>{title}</h3>
      <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}
