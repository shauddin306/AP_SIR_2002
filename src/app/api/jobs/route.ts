import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceClient()

    // Fetch active jobs (running, pending) and recent done/error jobs (limit 20)
    const { data, error } = await supabase
      .from('extraction_jobs')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ jobs: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
