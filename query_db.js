const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('voters')
    .select('page_no')
    .eq('assembly_no', 152)
    .eq('part_no', 189);
    
  if (error) console.error(error);
  else {
    const counts = {};
    for (let row of data) {
      counts[row.page_no] = (counts[row.page_no] || 0) + 1;
    }
    console.log("Pages processed:", counts);
  }
}
check();
