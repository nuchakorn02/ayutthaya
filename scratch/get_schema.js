const { getSupabaseConfig } = require('./supabase-env');
const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

async function run() {
  const res = await fetch(supabaseUrl + '/rest/v1/', {
    headers: {
      'apikey': supabaseServiceRoleKey,
      'Authorization': 'Bearer ' + supabaseServiceRoleKey
    }
  });
  const json = await res.json();
  console.log('Paths in OpenAPI schema:');
  Object.keys(json.paths).forEach(p => {
    if (p.includes('rpc')) {
      console.log('RPC Path:', p);
    }
  });
}

run();
