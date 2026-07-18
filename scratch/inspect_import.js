const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omlbtybplmeryoigwmac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE';

const supabase = createClient(supabaseUrl, supabaseKey);

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
