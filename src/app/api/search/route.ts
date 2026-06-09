import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'
import { generateCanonicalName, nysiis } from '@/lib/extraction/tokenizer'

// @ts-ignore
import Sanscript from '@indic-transliteration/sanscript'

export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const userClient = await createClient()
  const { data: { session } } = await userClient.auth.getSession()
  
  const supabase = createServiceClient()

  // 1. IP Rate Limiting Layer (only for anonymous users)
  if (!session) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    
    // Check IP count
    const { data: ipData } = await supabase
      .from('ip_search_limits')
      .select('search_count')
      .eq('ip_address', ip)
      .single()
      
    // Allow exactly 3 searches. Block the 4th.
    if (ipData && ipData.search_count >= 3) {
      return NextResponse.json({ error: 'LOGIN_REQUIRED' }, { status: 403 })
    }
    
    // Increment count
    await supabase
      .from('ip_search_limits')
      .upsert({ 
        ip_address: ip, 
        search_count: (ipData?.search_count || 0) + 1,
        updated_at: new Date().toISOString()
      }, { onConflict: 'ip_address' })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  
  // Transliterate English queries to Telugu
  let telugu_q = ''
  if (q && /^[a-zA-Z\s]+$/.test(q)) {
    const itransQuery = q.toLowerCase()
    telugu_q = Sanscript.t(itransQuery, 'itrans', 'telugu')
  }

  // Build canonical version of the query (e.g. "khadar" → "khdr")
  // This is the same canonical map used when indexing voter records.
  // Passing it to the SQL function enables a fast canonical column match.
  const canonical_q = generateCanonicalName(q)

  // Compute NYSIIS phonetic code (e.g. "Qadir" -> "KADAR")
  const nysiis_q = nysiis(q)
  const relative_name = searchParams.get('relative_name')?.trim().toLowerCase() || ''
  const assembly_no = searchParams.get('assembly_no')
    ? parseInt(searchParams.get('assembly_no')!, 10) : null
  const part_no = searchParams.get('part_no')
    ? parseInt(searchParams.get('part_no')!, 10) : null
  const family_house_no_normalized = searchParams.get('family_house_no_normalized')
    ? parseFloat(searchParams.get('family_house_no_normalized')!) : null
  const family_part_no = searchParams.get('family_part_no')
    ? parseInt(searchParams.get('family_part_no')!, 10) : null

  // We fetch a larger limit to allow post-filtering for relative_name
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

  try {
    // ----------------------------------------------------------------------
    // MODE 1: FAMILY TREE BYPASS
    // ----------------------------------------------------------------------
    if (family_house_no_normalized != null && family_part_no) {
      const { data: family, error } = await supabase
        .from('voters')
        .select('*')
        .eq('part_no', family_part_no)
        .eq('house_no_normalized', family_house_no_normalized)
        .order('age', { ascending: false })
      
      if (error) throw error

      return NextResponse.json({
        results: (family || []).map((r: any) => ({
          ...r,
          match_type: 'EXACT',
          match_score: 1.0,
        })),
        query: `Family Match`,
        total: family?.length || 0,
        mode: 'family_tree'
      })
    }

    if (!q || q.length < 1) {
      return NextResponse.json({ results: [], query: q })
    }

    // ----------------------------------------------------------------------
    // MODE 2: AI 8-LAYER SEARCH (via Python Indic Microservice)
    // ----------------------------------------------------------------------
    
    // FAST-PATH: If it's a House Number or EPIC ID
    const isHouseNumber = /^[0-9]+[0-9-/\sA-Za-z]*$/.test(q);
    const isEpicId = /^[A-Za-z]{3}[0-9]{5,10}$/.test(q);
    const isHouseOrEpic = isHouseNumber || isEpicId;
    
    if (isHouseOrEpic) {
      let queryBuilder = supabase
        .from('voters')
        .select('*')
        .or(`house_no.ilike.${q}%,epic_id.ilike.${q}%`)
        .limit(limit);
        
      if (assembly_no) queryBuilder = queryBuilder.eq('assembly_no', assembly_no);
      if (part_no) queryBuilder = queryBuilder.eq('part_no', part_no);
      if (relative_name) {
        queryBuilder = queryBuilder.or(`relative_name_english.ilike.%${relative_name}%,relative_name_telugu.ilike.%${relative_name}%`);
      }
      
      const { data: fastResults, error: fastError } = await queryBuilder;
      
      if (!fastError && fastResults && fastResults.length > 0) {
        return NextResponse.json({
          results: fastResults.map((r: any) => ({ ...r, match_type: 'EXACT', match_score: 1.0 })),
          query: q,
          total: fastResults.length,
          mode: 'house_or_epic_fast_path'
        })
      }
      return NextResponse.json({ results: [], query: q, total: 0, mode: 'house_or_epic_fast_path' })
    }

    let finalResults: any[] = []

    try {
      // Attempt to hit the Python Indic NLP Microservice (Railway search service)
      let pythonBaseUrl = process.env.PYTHON_SEARCH_URL || process.env.PYTHON_ENGINE_URL || 'http://127.0.0.1:8001'
      if (!pythonBaseUrl.startsWith('http://') && !pythonBaseUrl.startsWith('https://')) {
        pythonBaseUrl = 'https://' + pythonBaseUrl
      }
      const pythonRes = await fetch(`${pythonBaseUrl}/v1/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          assembly_no: assembly_no,
          part_no: part_no,
          relative_name: relative_name,
          limit: limit
        }),
        signal: AbortSignal.timeout(3000) // 3-second timeout for the Python engine
      })
      
      if (pythonRes.ok) {
        const pyData = await pythonRes.json()
        finalResults = pyData.results || []
        console.log(`[Python Engine] Found ${finalResults.length} results. Variants tested:`, pyData.variants_tested)
      } else {
        throw new Error('Python API returned ' + pythonRes.status)
      }
    } catch (pyErr) {
      console.warn('[Python Engine] Unreachable or failed, falling back to PostgreSQL RPC:', pyErr)
      
      // Fallback: Use fast JS query builder instead of search_voters to avoid timeout without index
      let queryBuilder = supabase.from('voters').select('*').limit(limit)
      
      if (q) {
        queryBuilder = queryBuilder.or(`voter_name_english.ilike.%${q}%,voter_name_telugu.ilike.%${q}%,relative_name_english.ilike.%${q}%`)
      }
      if (assembly_no) queryBuilder = queryBuilder.eq('assembly_no', assembly_no)
      if (part_no) queryBuilder = queryBuilder.eq('part_no', part_no)
      
      const { data: results, error } = await queryBuilder

      if (error) throw error
      finalResults = (results || []).map((r: any) => ({ ...r, match_type: 'CLOSE', match_score: 0.9 }))

      // Fallback Phase 2: Fuzzy search
      if (finalResults.length === 0) {
        const { data: fallback } = await supabase.rpc('fuzzy_search_voters', {
          query_text: q,
          p_limit: limit
        })
        finalResults = (fallback || []).map((r: Record<string, unknown>) => ({
          ...r, match_type: 'POSSIBLE', match_score: 0.5
        }))
      }
    }

    // Apply the requested limit after filtering
    finalResults = finalResults.slice(0, limit)

    // Sort: exact first, then score desc, then house_no_normalized
    const sorted = [...finalResults].sort((a, b) => {
      const order = { EXACT: 0, CLOSE: 1, POSSIBLE: 2 }
      const typeOrder = (order[a.match_type as keyof typeof order] ?? 2)
        - (order[b.match_type as keyof typeof order] ?? 2)
      if (typeOrder !== 0) return typeOrder
      if (b.match_score !== a.match_score) return b.match_score - a.match_score
      return (a.house_no_normalized ?? 9999) - (b.house_no_normalized ?? 9999)
    })

    // Background Analytics: Log 0-result searches or all searches
    if (sorted.length === 0 && q) {
      // Don't await this, let it run in the background
      supabase.from('search_logs').insert({
        query_text: q,
        assembly_no: assembly_no,
        results_count: 0
      }).then(({ error }) => {
        if (error) console.error('Failed to log search analytics:', error)
      })
    }

    return NextResponse.json({
      results: sorted,
      query: q,
      total: sorted.length,
      mode: 'search'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    })
  } catch (err: any) {
    console.error('Search error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
