import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('get_voter_demographics')
    
    if (error) throw error

    // Map the RPC data to the format recharts expects
    const chartData = (data || []).map((row: any) => ({
      name: row.gender === 'M' ? 'Male' : row.gender === 'F' ? 'Female' : 'Other',
      value: parseInt(row.count)
    })).sort((a: any, b: any) => b.value - a.value) // Sort by largest first

    return NextResponse.json({ data: chartData })
  } catch (err: any) {
    // If the RPC isn't available yet, just return dummy data or an empty array
    // This allows the UI to not crash while the user hasn't run the SQL command
    console.error('Demographics error:', err)
    return NextResponse.json({ data: [] })
  }
}
