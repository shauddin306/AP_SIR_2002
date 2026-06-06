import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'

export const runtime = 'nodejs'

// GET /api/parts — all assemblies and their parts
// GET /api/parts?assembly_no=152&part_no=69&page=1 — paginated voters for a part
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const assembly_no = searchParams.get('assembly_no')
    ? parseInt(searchParams.get('assembly_no')!, 10) : null
  const part_no = searchParams.get('part_no')
    ? parseInt(searchParams.get('part_no')!, 10) : null
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const page_size = Math.min(100, parseInt(searchParams.get('page_size') || '50', 10))
  const sort_by = searchParams.get('sort_by') || 'house_no_normalized'
  const sort_dir = searchParams.get('sort_dir') === 'desc' ? false : true

  const supabase = createServiceClient()

  // Return all parts grouped by assembly
  if (!assembly_no || !part_no) {
    const { data, error } = await supabase
      .from('voter_parts')
      .select('*')
      .order('assembly_no', { ascending: true })
      .order('part_no', { ascending: true })

    if (error) return NextResponse.json({ error: String(error) }, { status: 500 })

    // Group by assembly
    const grouped: Record<number, {
      assembly_name: string
      assembly_no: number
      parts: typeof data
    }> = {}

    for (const part of (data || [])) {
      if (!grouped[part.assembly_no]) {
        grouped[part.assembly_no] = {
          assembly_name: part.assembly_name,
          assembly_no: part.assembly_no,
          parts: [],
        }
      }
      grouped[part.assembly_no].parts.push(part)
    }

    return NextResponse.json({ assemblies: Object.values(grouped) })
  }

  // Return paginated voters for a specific part
  const from = (page - 1) * page_size
  const to = from + page_size - 1

  const allowedSorts = [
    'house_no_normalized', 'serial_no', 'voter_name_english',
    'age', 'gender', 'epic_id'
  ]
  const safeSortBy = allowedSorts.includes(sort_by) ? sort_by : 'house_no_normalized'

  const { data, error, count } = await supabase
    .from('voters')
    .select('*', { count: 'exact' })
    .eq('assembly_no', assembly_no)
    .eq('part_no', part_no)
    .order(safeSortBy, { ascending: sort_dir, nullsFirst: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 })

  return NextResponse.json({
    voters: data || [],
    total: count ?? 0,
    page,
    page_size,
    total_pages: Math.ceil((count ?? 0) / page_size),
  })
}
