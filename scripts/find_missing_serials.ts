import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function findMissing() {
  const { data, error } = await supabase
    .from('voters')
    .select('serial_no')
    .eq('assembly_no', 152)
    .eq('part_no', 68)
    .order('serial_no', { ascending: true })

  if (error) {
    console.error("Error fetching data:", error)
    return
  }

  if (!data || data.length === 0) {
    console.log("No voters found in Part 68.")
    return
  }

  const serials = data.map(d => parseInt(d.serial_no)).filter(n => !isNaN(n))
  
  // Find gaps
  let missingRanges = []
  let expected = 1

  // Handle case where it doesn't start at 1
  if (serials[0] > 1) {
    missingRanges.push(`1 to ${serials[0] - 1}`)
    expected = serials[0]
  }

  for (let i = 0; i < serials.length; i++) {
    if (serials[i] > expected) {
      if (serials[i] - 1 === expected) {
         missingRanges.push(`${expected}`)
      } else {
         missingRanges.push(`${expected} to ${serials[i] - 1}`)
      }
    }
    expected = serials[i] + 1
  }

  console.log(`Total voters extracted for Part 68: ${serials.length}`)
  console.log(`Lowest Serial: ${serials[0]}, Highest Serial: ${serials[serials.length - 1]}`)
  
  if (missingRanges.length === 0) {
    console.log("No missing serial numbers!")
  } else {
    console.log("MISSING SERIAL NUMBERS:")
    missingRanges.forEach(r => console.log(`- ${r}`))
  }
}

findMissing()
