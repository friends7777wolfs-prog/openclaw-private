require('dotenv').config();
const http = require('http');
const fs = require('fs');

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOP = process.env.SHOPIFY_DOMAIN;
const PORT = 3000;
const MY_IP = '34.31.6.152';
const REDIRECT_URI = 'http://' + MY_IP + ':' + PORT + '/callback';
const SCOPES = 'read_orders,write_orders,read_products,write_products,read_inventory,write_inventory,read_locations,read_reports';

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/callback')) {
    const url = new URL(req.url, 'http://' + MY_IP + ':' + PORT);
    const code = url.searchParams.get('code');
    const tokenRes = await fetch('https://' + SHOP + '/admin/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code: code })
    });
    const data = await tokenRes.json();
    if (data.access_token) {
      let env = fs.readFileSync('.env', 'utf8');
      env = env + '\nSHOPIFY_ACCESS_TOKEN=' + data.access_token;
      fs.writeFileSync('.env', env);
      res.end('<h1>OK! Token saved</h1><p>' + data.access_token + '</p>');
      console.log('\nSHOPIFY_ACCESS_TOKEN=' + data.access_token);
      setTimeout(function() { server.close(); process.exit(0); }, 2000);
    } else {
      res.end('<h1>Error</h1><pre>' + JSON.stringify(data) + '</pre>');
    }
  }
});

server.listen(PORT, '0.0.0.0', function() {
  const authUrl = 'https://' + SHOP + '/admin/oauth/authorize?client_id=' + CLIENT_ID + '&scope=' + SCOPES + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&state=openclaw123';
  console.log('\nפתח בדפדפן:\n' + authUrl);
});
