const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
  const importId = '6b6f40ba-88d0-4f68-b00e-bbfe6c288f52';
  console.log(`Querying import logs for session: ${importId}`);
  const { data: logs, error } = await supabase
    .from('import_logs')
    .select('*')
    .eq('import_id', importId);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log(`Total logs in session: ${logs.length}`);
  logs.forEach((log) => {
    console.log(`Name: "${log.player_name}" | Division: "${log.division}" | Old: ${log.old_score} | New: ${log.new_score}`);
  });
}

test();
