import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/shauddin/Voter_Search_SIR_AP/voter-search-ap/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { count, error } = await supabase
    .from('voters')
    .select('*', { count: 'exact', head: true })
    .eq('assembly_no', 152)
    .eq('part_no', 69);
  
  console.log('Total voters for 152/69:', count);
  console.log('Error:', error);

  const { data } = await supabase
    .from('voters')
    .select('id')
    .eq('assembly_no', 152)
    .eq('part_no', 69)
    .limit(2000);
  
  console.log('Rows returned with limit 2000:', data?.length);
}
run();
