import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HistoryClient } from './HistoryClient'

export const metadata = {
  title: 'Review History - Admin Dashboard',
}

export default async function HistoryPage() {
  const supabase = await createClient()
  
  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (roleData?.role !== 'admin' && roleData?.role !== 'super-admin') {
    redirect('/search')
  }

  return (
    <div className="admin-container fade-in" style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>
          Review History
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          View history of approved and rejected OCR corrections.
        </p>
      </div>

      <HistoryClient adminUserId={user.id} />
    </div>
  )
}
