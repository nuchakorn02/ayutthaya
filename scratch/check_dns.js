const dns = require('dns');
const { getSupabaseConfig } = require('./supabase-env');
const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
const supabaseHost = new URL(supabaseUrl).hostname;
const databaseHost = `db.${supabaseHost}`;

dns.lookup(supabaseHost, (err, address, family) => {
  if (err) {
    console.log(`dns.lookup failed for ${supabaseHost}:`, err.message);
  } else {
    console.log('dns.lookup succeeded:', address);
  }
});

dns.lookup(databaseHost, (err, address, family) => {
  if (err) {
    console.log(`dns.lookup failed for ${databaseHost}:`, err.message);
  } else {
    console.log('dns.lookup succeeded for db:', address);
  }
});

fetch(`${supabaseUrl}/rest/v1/players`, {
  headers: {
    'apikey': supabaseServiceRoleKey
  }
})
.then(r => console.log('Fetch status:', r.status))
.catch(err => console.error('Fetch error:', err.message));
