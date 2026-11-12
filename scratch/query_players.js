const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
  console.log('Querying players in database...');
  const { data: players, error } = await supabase.from('players').select('*').order('division', { ascending: true });
  if (error) {
    console.error('Error fetching players:', error);
  } else {
    console.log('Total Players Count:', players.length);
    players.forEach((p, idx) => {
      console.log(`[${idx+1}] Name: "${p.player_name}" | Division: "${p.division}" | Score: ${p.total_score} | Position: "${p.position}"`);
    });
  }
}

test();
