import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ ok: false, error: 'Missing URL parameter' }, { status: 400 })
    }

    // ECI servers block HEAD requests and require a User-Agent
    const controller = new AbortController()
    const res = await fetch(url, { 
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal 
    })
    
    // We only need the headers, so immediately abort the download to save bandwidth
    const contentType = res.headers.get('content-type')
    const size = res.headers.get('content-length')
    controller.abort()

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Failed to fetch URL: HTTP ${res.status}` })
    }

    if (!contentType?.includes('application/pdf')) {
      return NextResponse.json({ ok: false, error: `URL is not a PDF (Content-Type: ${contentType})` })
    }

    return NextResponse.json({ ok: true, size: parseInt(size || '0') })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
