const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('extraction_jobs')
    .select('*')
    .eq('id', 'ad1dbae2-7e4e-4582-bd32-4311a0f92c87');
    
  console.log(data);
}
check();
