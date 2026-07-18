fetch('https://omlbtybplmeryoigwmac.supabase.co/rest/v1/players', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE'
  }
})
.then(r => {
  console.log('Status:', r.status);
  for (const [key, val] of r.headers.entries()) {
    console.log(`${key}: ${val}`);
  }
})
.catch(err => console.error(err));
