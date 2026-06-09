const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('extraction_jobs')
    .update({ status: 'error', error_message: 'Next.js restarted to apply config' })
    .eq('id', '316b2e9d-dc01-4905-b1c0-75c1af284a52');
    
  if (error) console.error(error);
  else console.log("Job marked as error.");
}
check();
