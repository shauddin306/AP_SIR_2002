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
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '6px 20px 6px 6px',
            borderRadius: '100px',
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
            marginBottom: 40,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
            {/* Animated shimmer border effect */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.15), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 4s infinite linear',
              zIndex: 0,
              pointerEvents: 'none'
            }} />
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              boxShadow: '0 2px 12px rgba(124, 58, 237, 0.5)',
              position: 'relative',
              zIndex: 1
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            
            <p style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#e2e8f0',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              position: 'relative',
              zIndex: 1
            }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>POWERED BY</span> 
              <span style={{
                background: 'linear-gradient(90deg, #60a5fa, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 900,
                letterSpacing: '1px'
              }}>
                MINDT PVT LTD
              </span>
            </p>
          </div>
          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-1px',
            marginBottom: 24,
            color: '#ffffff'
          }}>
            FIND ANY VOTER<br />IN SECONDS
          </h1>
          
          <p style={{
            fontSize: 18, color: '#94a3b8',
            maxWidth: 680, margin: '0 auto', lineHeight: 1.7,
            fontWeight: 400
          }}>
            Search through the historic 2002 registered voter lists in India quickly and accurately with our AI-powered platform. Fast, reliable, and user-friendly.
          </p>
        </div>

        {/* Coverage Flash Note */}
        <div style={{ marginBottom: 40 }}>
          <LiveCoverage />
        </div>

        {/* Search Area */}
        <div style={{ marginBottom: 80 }}>
          <HomeSearchClient />
        </div>

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 80 }}>
          <FeatureCard
            icon="🔍"
            titleEn="Smart Name Search"
            titleTe="స్మార్ట్ పేరు శోధన"
            desc="Search in Telugu or English — misspellings handled automatically with AI phonetic matching"
          />
          <FeatureCard
            icon="🏠"
            titleEn="Door-to-Door Search"
            titleTe="ఇంటింటి శోధన"
            desc="Search by house number to find all registered voters at the same address. Perfect for family searches."
          />
          <FeatureCard
            icon="🪪"
            titleEn="EPIC ID Lookup"
            titleTe="ఎపిక్ ID శోధన"
            desc="Enter any EPIC voter ID (e.g. AP22152000030568) for instant exact match results"
          />
          <FeatureCard
            icon="👥"
            titleEn="Relative Name Filter"
            titleTe="బంధువు పేరు ఫిల్టర్"
            desc="Filter by father's or husband's name alongside the voter name for pinpoint accuracy"
          />
          <FeatureCard
            icon="📍"
            titleEn="Part-wise Browsing"
            titleTe="భాగాల వారీగా"
            desc="Browse by booth part number (1-239) to see all voters in a specific polling station area"
          />
          <FeatureCard
            icon="♾️"
            titleEn="Unlimited Searches"
            titleTe="అపరిమిత శోధనలు"
            desc="No search limits. Search as many times as you need — built for ground-level campaign workers"
          />
        </div>



      </div>
    </div>
  )
}

function FeatureCard({ icon, titleEn, titleTe, desc }: { icon: string; titleEn: string; titleTe: string; desc: string }) {
  return (
    <div className="mockup-feature-card">
      <div style={{ marginBottom: 16, fontSize: 28 }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>{titleEn}</h3>
      <h4 style={{ fontSize: 14, fontWeight: 500, color: '#f97316', marginBottom: 12 }}>{titleTe}</h4>
      <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}
