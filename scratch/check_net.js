const dns = require('dns');

dns.lookup('db.omlbtybplmeryoigwmac.supabase.net', (err, address) => {
  if (err) {
    console.log('Failed to resolve db.omlbtybplmeryoigwmac.supabase.net:', err.message);
  } else {
    console.log('Resolved db.omlbtybplmeryoigwmac.supabase.net to:', address);
  }
});
