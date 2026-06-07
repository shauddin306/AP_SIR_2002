'use client'

import { createClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button onClick={handleSignOut} style={{
      border: '1px solid rgba(255,255,255,0.2)', padding: '4px 16px', borderRadius: 20,
      color: 'white', textDecoration: 'none', fontSize: 12, fontWeight: 500,
      background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
      cursor: 'pointer', transition: 'all 0.2s'
    }}>
      Sign Out
    </button>
  )
}
