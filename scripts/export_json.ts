import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for script
const supabase = createClient(supabaseUrl, supabaseKey)

async function exportJson() {
  console.log('Fetching voters for Part 68...')
  const { data, error } = await supabase
    .from('voters')
    .select('*')
    .eq('part_no', 68)
    .order('serial_no', { ascending: true })

  if (error) {
    console.error('Error fetching data:', error)
    return
  }

  const filename = 'Part_68_Voters.json'
  const filepath = path.join(process.cwd(), filename)
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  console.log(`\n✅ Successfully exported ${data.length} voters to JSON file!`)
  console.log(`📁 Saved at: ${filepath}`)
}

exportJson()
