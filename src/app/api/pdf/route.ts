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

  // If it's an external HTTP URL (like from ECI directly), proxy the request to bypass X-Frame-Options
  if (file.startsWith('http://') || file.startsWith('https://')) {
    try {
      const eciRes = await fetch(file, {
        headers: {
          // Add standard headers to look like a browser
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1'
        }
      });
      
      if (!eciRes.ok) {
        return NextResponse.json({ error: `External server returned ${eciRes.status}` }, { status: eciRes.status })
      }
      
      return new NextResponse(eciRes.body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
          // Crucially, NO X-Frame-Options header so the iframe works
        }
      })
    } catch (err: any) {
      console.error('Proxy fetch error:', err)
      return NextResponse.json({ error: 'Failed to proxy PDF' }, { status: 500 })
    }
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
