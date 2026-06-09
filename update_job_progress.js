const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('voters')
    .select('page_no')
    .eq('assembly_no', 152)
    .eq('part_no', 189);
    
  if (error) {
    console.error(error);
    return;
  }
  
  const pages = new Set();
  data.forEach(r => pages.add(r.page_no));
  const processed_pages = pages.size;
  const total_voters = data.length;
  
  const status = processed_pages >= 29 ? 'done' : 'running';
  
  await supabase
    .from('extraction_jobs')
    .update({ processed_pages, total_voters, status })
    .eq('id', 'a7fe9167-a182-44bd-8df2-077c12f0c2bc');
    
  console.log(`Updated job to: ${processed_pages}/29 pages, ${total_voters} voters, status: ${status}`);
}
check();
