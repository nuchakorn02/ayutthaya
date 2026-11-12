const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
  console.log('Querying players sorted by created_at...');
  const { data: players, error } = await supabase
    .from('players')
    .select('player_name, division, total_score, created_at, position')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  players.forEach((p, idx) => {
    console.log(`[${idx + 1}] CreatedAt: ${p.created_at} | Name: "${p.player_name}" | Division: "${p.division}" | Score: ${p.total_score}`);
  });
}

test();
