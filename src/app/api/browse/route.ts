import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const assembly_no = searchParams.get('assembly_no')
    ? parseInt(searchParams.get('assembly_no')!, 10) : null
  const part_no = searchParams.get('part_no')
    ? parseInt(searchParams.get('part_no')!, 10) : null

  if (!assembly_no || !part_no) {
    return NextResponse.json({ error: 'Assembly and Part No are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    // We intentionally fetch up to 2000 voters which safely covers a single Part
    // Sorting structurally: house number first, then age to put head of family at top
    const { data: voters, error } = await supabase
      .from('voters')
      .select('*')
      .eq('assembly_no', assembly_no)
      .eq('part_no', part_no)
      .order('house_no_normalized', { ascending: true, nullsFirst: false })
      .order('age', { ascending: false })
      .limit(2000)

    if (error) throw error

    return NextResponse.json({ results: voters || [], total: voters?.length || 0 })
  } catch (err) {
    console.error('[browse] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
