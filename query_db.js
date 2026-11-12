const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./scratch/supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
  console.log('Attempting to delete players with .neq("id", "00000000-0000-0000-0000-000000000000")...');
  const { data, error } = await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log('Delete succeeded! Returned data length:', data ? data.length : 'null/void');
    
    // Check remaining players
    const { data: remaining } = await supabase.from('players').select('*');
    console.log('Remaining players in DB:', remaining ? remaining.length : 0);
  }
}

test();
