const dns = require('dns');

dns.lookup('omlbtybplmeryoigwmac.supabase.co', (err, address, family) => {
  if (err) {
    console.log('dns.lookup failed for omlbtybplmeryoigwmac.supabase.co:', err.message);
  } else {
    console.log('dns.lookup succeeded:', address);
  }
});

dns.lookup('db.omlbtybplmeryoigwmac.supabase.co', (err, address, family) => {
  if (err) {
    console.log('dns.lookup failed for db.omlbtybplmeryoigwmac.supabase.co:', err.message);
  } else {
    console.log('dns.lookup succeeded for db:', address);
  }
});

fetch('https://omlbtybplmeryoigwmac.supabase.co/rest/v1/players', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE'
  }
})
.then(r => console.log('Fetch status:', r.status))
.catch(err => console.error('Fetch error:', err.message));
