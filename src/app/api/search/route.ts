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
    // MODE 2: AI 8-LAYER SEARCH
    // ----------------------------------------------------------------------
    
    // OPTIMAL APPROACH UPGRADE:
    // If the query is a house number (e.g. 44-123 or 44/123), we bypass text search
    // and query the normalized numeric column directly for absolute precision.
    let isHouseNumberSearch = false;
    let houseNumberNormalizedQuery = null;
    
    // Check if query is mostly numbers, optionally containing -, /, or letters
    if (/^[0-9]+[-/\sA-Za-z0-9]*$/.test(q) && q.replace(/[^0-9]/g, '').length > 0) {
      const numMatch = q.replace(/[^0-9.]/g, '');
      if (numMatch) {
        isHouseNumberSearch = true;
        houseNumberNormalizedQuery = parseFloat(numMatch);
      }
    }

    let finalResults: any[] = [];

    // Layer 0: Direct House Number Normalized Match
    if (isHouseNumberSearch && houseNumberNormalizedQuery !== null) {
      let dbQuery = supabase
        .from('voters')
        .select('*')
        .eq('house_no_normalized', houseNumberNormalizedQuery)
        .limit(limit);
        
      if (assembly_no) dbQuery = dbQuery.eq('assembly_no', assembly_no);
      if (part_no) dbQuery = dbQuery.eq('part_no', part_no);
      if (relative_name) {
        dbQuery = dbQuery.or(`relative_name_english.ilike.%${relative_name}%,relative_name_telugu.ilike.%${relative_name}%`);
      }
      
      const { data: houseResults, error: houseError } = await dbQuery;
      
      if (!houseError && houseResults && houseResults.length > 0) {
        finalResults = houseResults.map((r: any) => ({
          ...r,
          match_type: 'EXACT',
          match_score: 1.0,
        }));
      }
    }

    // If no absolute house matches found, fallback to AI Text Search
    if (finalResults.length === 0) {
      const { data: results, error } = await supabase.rpc('search_voters', {
        query_text: q,
        p_telugu_query: telugu_q || null,
        p_limit: limit,
        p_assembly_no: assembly_no ?? null,
        p_part_no: part_no ?? null,
        p_relative_name: relative_name || null,
        p_canonical_query: canonical_q || null,
        p_nysiis_query: nysiis_q || null,
      })

      if (error) throw error
      finalResults = results || []

      // If no results at all, try a broader fuzzy search (Phase 1 Typo Tolerance)
      if (finalResults.length === 0) {
        const { data: fallback } = await supabase.rpc('fuzzy_search_voters', {
          query_text: q,
          p_limit: limit
        })

        finalResults = (fallback || []).map((r: Record<string, unknown>) => ({
          ...r,
          match_type: 'POSSIBLE',
          match_score: 0.5,
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
