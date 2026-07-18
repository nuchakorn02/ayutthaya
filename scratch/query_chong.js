const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omlbtybplmeryoigwmac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Querying chong3556 in players table...');
  const { data: players, error } = await supabase.from('players').select('*').eq('player_name', 'chong3556');
  console.log('Players found:', players);

  console.log('Querying import_logs for chong3556...');
  const { data: logs, error2 } = await supabase.from('import_logs').select('*').eq('player_name', 'chong3556');
  console.log('Import logs found:', logs);

  console.log('Querying all import sessions...');
  const { data: imports, error3 } = await supabase.from('imports').select('*').order('created_at', { ascending: false });
  console.log('Latest imports:', imports);
}

test();
