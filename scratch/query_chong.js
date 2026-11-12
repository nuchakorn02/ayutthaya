const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
