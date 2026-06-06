import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser / client-side (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side only (service role – bypasses RLS)
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

export type VoterRow = {
  id: string
  assembly_name: string
  assembly_no: number
  part_no: number
  polling_station_no: number | null
  polling_station_name: string | null
  serial_no: number
  house_no: string | null
  house_no_normalized: number | null
  voter_name_telugu: string | null
  voter_name_english: string | null
  relative_name_telugu: string | null
  relative_name_english: string | null
  relation_type: string | null
  gender: string | null
  age: number | null
  epic_id: string | null
  page_no: number | null
  search_tokens: string[]
  name_embedding?: number[] | null
  source_pdf: string | null
  confidence: 'high' | 'medium' | 'low'
  created_at?: string
}

export type SearchResult = VoterRow & {
  match_type: 'EXACT' | 'CLOSE' | 'POSSIBLE'
  match_score: number
}

export type VoterPart = {
  id: string
  assembly_name: string
  assembly_no: number
  part_no: number
  polling_station_no: number | null
  polling_station_name: string | null
  source_pdf: string | null
  voter_count: number
  created_at: string
}

export type ExtractionJob = {
  id: string
  assembly_name: string
  assembly_no: number
  part_no: number
  source_pdf: string
  status: 'pending' | 'running' | 'done' | 'error'
  total_pages: number
  processed_pages: number
  total_voters: number
  error_message: string | null
  created_at: string
  updated_at: string
}
