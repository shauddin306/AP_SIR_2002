import { fromBuffer } from 'pdf2pic'
import sharp from 'sharp'

export interface PdfPageImage {
  page: number
  base64: string
  mimeType: 'image/jpeg'
}

/**
 * Convert a PDF buffer to an array of base64 JPEG images (one per page)
 * Uses pdf2pic under the hood (requires GraphicsMagick or ImageMagick)
 */
export async function pdfToImages(pdfBuffer: Buffer): Promise<PdfPageImage[]> {
  const convert = fromBuffer(pdfBuffer, {
    density: 150,         // Reduced to 150 DPI to save 75% on API costs
    saveFilename: 'page',
    format: 'jpeg',
    width: 1240,          // Half width
    height: 1754,         // Half height
  })

  // First, figure out the page count
  // pdf2pic doesn't expose page count directly, we use a bulk convert
  const results = await convert.bulk(-1, { responseType: 'base64' })

  const images: PdfPageImage[] = []

  for (const result of results) {
    if (!result.base64) continue

    // Optionally enhance contrast for better OCR (for low-quality scans)
    const enhanced = await sharp(Buffer.from(result.base64, 'base64'))
      .grayscale()
      .normalize()             // auto levels
      .sharpen()
      .jpeg({ quality: 90 })
      .toBuffer()

    images.push({
      page: result.page ?? 1,
      base64: enhanced.toString('base64'),
      mimeType: 'image/jpeg',
    })
  }

  return images
}

/**
 * Extract total page count from a PDF buffer
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const convert = fromBuffer(pdfBuffer, {
    density: 72,
    saveFilename: 'count',
    format: 'jpeg',
  })
  // Convert just page 1 to get metadata
  try {
    const first = await convert(1, { responseType: 'base64' })
    // pdf2pic returns info about pages when converting in bulk
    // We'll use a different approach: count via bulk -1 but only metadata
    const all = await convert.bulk(-1, { responseType: 'base64' })
    return all.length
  } catch {
    return 0
  }
}
