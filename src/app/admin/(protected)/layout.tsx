import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Check Auth Session
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    redirect('/admin/login')
  }

  // 2. Optional: We can check user_roles here if we want to strictly deny access
  // For now, we will allow any authenticated user to see the dashboard, 
  // but the RLS and API endpoints will block uploads if they aren't 'admin' or 'super-admin'.
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const role = roleData?.role || 'user'
  
  if (role !== 'admin' && role !== 'super-admin') {
    // Return unauthorized UI or just let them in but disable buttons
    // We'll let them in, but the dashboard UI will say "Pending Approval"
  }

  return (
    <div className="mesh-background" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="mesh-glow-saffron" />
      <main style={{
        flex: 1,
        position: 'relative',
        zIndex: 10,
        paddingTop: 120, // push down below absolute TopNav
        paddingBottom: 80,
        paddingLeft: 24,
        paddingRight: 24,
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%'
      }}>
        {children}
      </main>
    </div>
  )
}
