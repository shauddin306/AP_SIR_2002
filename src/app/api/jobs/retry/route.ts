import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { jobId } = await req.json()
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Reset the job to pending
    const { error } = await supabase
      .from('extraction_jobs')
      .update({ 
        status: 'pending', 
        error_message: null,
        locked_by: null,
        locked_at: null
      })
      .eq('id', jobId)
      .eq('status', 'error')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
