const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function check() {
  const { data: players, error } = await supabase
    .from('players')
    .select('player_name, division, created_at, total_score, position')
    .eq('division', 'กองทัพมหาเสือพิทักษ์')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
  } else {
    players.forEach((p, idx) => {
      console.log(`[${idx+1}] Name: "${p.player_name}" | Score: ${p.total_score} | Position: "${p.position}" | CreatedAt: ${p.created_at}`);
    });
  }
}

check();
