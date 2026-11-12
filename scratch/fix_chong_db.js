const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fix() {
  console.log('Fixing chong3556 record in players table...');
  const { data, error } = await supabase
    .from('players')
    .update({
      division: 'กองทัพมหาเสือพิทักษ์',
      position: 'ทหารเสือประจำพระองค์'
    })
    .eq('player_name', 'chong3556');

  if (error) {
    console.error('Error updating player:', error);
  } else {
    console.log('Player updated successfully!');
  }
}

fix();
