require('dotenv').config({ path: '.env2' });
const http = require('http');
const fs = require('fs');

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOP = process.env.SHOPIFY_DOMAIN;
const PORT = 3000;
const MY_IP = '34.31.6.152';
const REDIRECT_URI = 'http://' + MY_IP + ':' + PORT + '/callback2';
const SCOPES = 'read_orders,write_orders,read_products,write_products,read_inventory,write_inventory,read_locations';

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/callback2')) {
    const url = new URL(req.url, 'http://' + MY_IP + ':' + PORT);
    const code = url.searchParams.get('code');
    const tokenRes = await fetch('https://' + SHOP + '/admin/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code: code })
    });
    const data = await tokenRes.json();
    if (data.access_token) {
      const env2 = fs.readFileSync('.env2', 'utf8');
      fs.writeFileSync('.env2', env2 + '\nSHOPIFY_ACCESS_TOKEN=' + data.access_token);
      res.end('<h1>OK!</h1><p>' + data.access_token + '</p>');
      console.log('TOKEN: ' + data.access_token);
      setTimeout(function() { server.close(); process.exit(0); }, 2000);
    } else {
      res.end('<h1>Error</h1><pre>' + JSON.stringify(data) + '</pre>');
    }
  } else {
    res.end('waiting...');
  }
});

server.listen(PORT, '0.0.0.0', function() {
  const authUrl = 'https://' + SHOP + '/admin/oauth/authorize?client_id=' + CLIENT_ID + '&scope=' + SCOPES + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&state=openclaw2';
  console.log('פתח בדפדפן:\n' + authUrl);
});
