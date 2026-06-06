import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
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

    const supabase = createServiceClient()

    // Check if this part already exists
    const { data: existing } = await supabase
      .from('voter_parts')
      .select('id, assembly_name, assembly_no, part_no, voter_count')
      .eq('assembly_no', assembly_no)
      .eq('part_no', part_no)
      .maybeSingle()

    // Store PDF in Supabase Storage
    const fileName = `${assembly_no}_${part_no}_${Date.now()}.pdf`

    const { error: storageError } = await supabase.storage
      .from('voter-pdfs')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' })

    if (storageError && storageError.message !== 'The resource already exists') {
      console.warn('[upload] Storage warning:', storageError.message)
    }

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
