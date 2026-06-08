import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReviewQueueClient } from './ReviewQueueClient'

export const metadata = {
  title: 'Review Queue - Admin Dashboard',
}

export default async function ReviewQueuePage() {
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
          Review Queue
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Safely review and approve offline OCR extraction drafts before they update the live database.
        </p>
      </div>

      <ReviewQueueClient adminUserId={user.id} />
    </div>
  )
}
