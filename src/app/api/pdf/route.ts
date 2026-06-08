import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/client'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const userClient = await createClient()
  const { data: { session } } = await userClient.auth.getSession()

  // Protect the route so only logged-in users can view PDFs
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const file = searchParams.get('file')

  if (!file) {
    return NextResponse.json({ error: 'File name required' }, { status: 400 })
  }

  try {
    // Use the Service Role Key to bypass RLS policies on the storage bucket
    const supabaseAdmin = createServiceClient()
    
    const { data, error } = await supabaseAdmin.storage
      .from('voter-pdfs')
      .createSignedUrl(file, 3600) // 1 hour expiration

    if (error) {
      throw error
    }

    if (data?.signedUrl) {
      return NextResponse.json({ signedUrl: data.signedUrl })
    } else {
      return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
    }
  } catch (err: any) {
    console.error('PDF signing error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
