const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('extraction_jobs')
    .select('*')
    .eq('id', 'a7fe9167-a182-44bd-8df2-077c12f0c2bc');
    
  if (error) console.error(error);
  else console.log("Job:", data);
}
check();
