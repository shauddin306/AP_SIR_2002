import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Fetch all jobs
    const { data: jobs, error } = await supabase
      .from('extraction_jobs')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Filter out 'done' jobs that are older than 2 days
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const recentJobs = jobs.filter(job => {
      if (job.status === 'done') {
        return new Date(job.updated_at) > twoDaysAgo
      }
      return true
    })

    // Sort: running first, then pending, then error, then done
    const sortedJobs = recentJobs.sort((a, b) => {
      const statusOrder = { 'running': 0, 'pending': 1, 'error': 2, 'done': 3 }
      const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 4
      const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 4
      
      if (orderA !== orderB) return orderA - orderB
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

    return NextResponse.json({ jobs: sortedJobs.slice(0, 100) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
