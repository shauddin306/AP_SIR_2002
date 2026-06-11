import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the request
    const authSupabase = await createClient()
    const { data: { session }, error: authError } = await authSupabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check Admin Role
    const { data: roleData } = await authSupabase
      .from('user_roles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = roleData?.role || 'user'
    if (role !== 'admin' && role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    const body = await req.json()
    const { pdf_url, assembly_name, polling_station_name, engine = 'gemini' } = body
    const assembly_no = parseInt(body.assembly_no, 10)
    const part_no = parseInt(body.part_no, 10)

    // Validate
    if (!pdf_url || !assembly_name || isNaN(assembly_no) || isNaN(part_no)) {
      return NextResponse.json(
        { error: 'Missing required fields: pdf_url, assembly_name, assembly_no, part_no' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    let fileName = ''

    if (engine === 'aws_daemon') {
      // Skip downloading on Vercel (bypasses ECI firewall). AWS Daemon will download it directly.
      console.log(`[from-url] AWS Daemon mode: Skipping Next.js download for ${pdf_url}`)
      fileName = pdf_url
    } else {
      // Fetch the PDF from the URL
      console.log(`[from-url] Downloading PDF from ${pdf_url}...`)
      const res = await fetch(pdf_url)
      if (!res.ok) {
        throw new Error(`Failed to download PDF: HTTP ${res.status}`)
      }
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/pdf')) {
        throw new Error(`URL did not return a PDF (Content-Type: ${contentType})`)
      }
      const arrayBuffer = await res.arrayBuffer()
      const pdfBuffer = Buffer.from(arrayBuffer)
      console.log(`[from-url] Downloaded ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`)

      fileName = `${assembly_no}_${part_no}_${Date.now()}.pdf`

      const { error: storageError } = await supabase.storage
        .from('voter-pdfs')
        .upload(fileName, pdfBuffer, { contentType: 'application/pdf' })

      if (storageError && storageError.message !== 'The resource already exists') {
        console.warn('[upload] Storage warning:', storageError.message)
      }
    }

    // Check if this part already exists
    const { data: existing } = await supabase
      .from('voter_parts')
      .select('id, assembly_name, assembly_no, part_no, voter_count')
      .eq('assembly_no', assembly_no)
      .eq('part_no', part_no)
      .maybeSingle()

    // Create extraction job
    const { data: job, error: jobError } = await supabase
      .from('extraction_jobs')
      .insert({
        assembly_name,
        assembly_no,
        part_no,
        source_pdf: fileName,
        status: 'pending',
        extraction_engine: engine,
      })
      .select()
      .single()

    if (jobError) throw jobError

    if (existing) {
      return NextResponse.json({
        conflict: true,
        existing: {
          assembly_name: existing.assembly_name,
          assembly_no: existing.assembly_no,
          part_no: existing.part_no,
          voter_count: existing.voter_count,
        },
        job_id: job.id,
        file_name: fileName,
      })
    }

    return NextResponse.json({
      conflict: false,
      job_id: job.id,
      file_name: fileName,
      assembly_name,
      assembly_no,
      part_no,
      polling_station_name,
    })
  } catch (err: any) {
    console.error('[upload] Error:', err.message)
    return NextResponse.json({ error: String(err.message) }, { status: 500 })
  }
}
