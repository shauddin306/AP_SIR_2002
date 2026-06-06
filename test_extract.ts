import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GeminiExtractor } from './src/lib/extraction/gemini-client';
import { pdfToImages } from './src/lib/extraction/pdf-extractor';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const extractor = new GeminiExtractor();

async function run() {
  const pdfBuffer = fs.readFileSync('/Users/shauddin/Voter_Search_SIR_AP/voter-search-ap/152_69_1780568963280.pdf'); // using a dummy path or how to get the pdf?
}
run();
