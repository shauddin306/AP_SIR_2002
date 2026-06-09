const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const sampleVoter = {
    assembly_name: 'Rayachoty',
    assembly_no: 152,
    part_no: 189,
    polling_station_name: 'Rayachoty',
    polling_station_no: 189,
    source_pdf: '152_189_test.pdf',
    extraction_engine: 'python',
    serial_no: 21,
    house_no: '1-6',
    house_no_normalized: '1-6',
    voter_name_telugu: 'యాసిన',
    voter_name_english: 'Yasina',
    relative_name_telugu: 'యాసిన',
    relative_name_english: 'Yasina',
    relation_type: 'తం',
    gender: 'Male',
    age: 42,
    epic_id: 'AP22152055',
    page_no: 3,
    search_tokens: 'Yasina',
    search_name_canonical: 'yasina',
    confidence: 'high'
  };

  const { error, data } = await supabase.from('voters').insert([sampleVoter]).select('id');
  if (error) console.error("INSERT ERROR:", error);
  else console.log("INSERT SUCCESS:", data);
}
test();
