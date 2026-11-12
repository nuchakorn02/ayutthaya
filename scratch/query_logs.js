const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
  console.log('Querying imports table...');
  const { data: impData } = await supabase.from('imports').select('*');
  console.log('Imports:', impData);

  console.log('Querying import_logs table...');
  const { data: logData } = await supabase.from('import_logs').select('*');
  console.log('Import Logs Count:', logData ? logData.length : 0);
  console.log('Sample Import Logs:', logData ? logData.slice(0, 5) : []);
}

test();
