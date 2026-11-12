const { getSupabaseConfig } = require('./supabase-env');
const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

fetch(`${supabaseUrl}/rest/v1/players`, {
  headers: {
    'apikey': supabaseServiceRoleKey
  }
})
.then(r => {
  console.log('Status:', r.status);
  for (const [key, val] of r.headers.entries()) {
    console.log(`${key}: ${val}`);
  }
})
.catch(err => console.error(err));
