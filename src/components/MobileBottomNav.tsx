'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide bottom nav on admin pages
  if (pathname?.startsWith('/admin')) return null;

  return (
    <nav className="mobile-bottom-nav md:hidden" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom)' // Safe area for iOS
    }}>
      <NavItem href="/" label="Home" icon={HomeIcon} active={pathname === '/'} />
      <NavItem href="/search" label="Search" icon={SearchIcon} active={pathname === '/search'} />
      <NavItem href="/browse" label="Directory" icon={FolderIcon} active={pathname === '/browse'} />
    </nav>
  );
}

function NavItem({ href, label, icon: Icon, active }: { href: string, label: string, icon: any, active: boolean }) {
  return (
    <Link href={href} style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      gap: 4,
      color: active ? '#60a5fa' : '#94a3b8',
      textDecoration: 'none',
      flex: 1,
      height: '100%'
    }}>
      <Icon active={active} />
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 500 }}>{label}</span>
    </Link>
  );
}

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SearchIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FolderIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);
