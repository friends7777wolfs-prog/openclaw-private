const fs = require('fs');
const TOKEN_CACHE_PATH = './shopify_token_cache.json';

function loadTokenCache() {
  if (!fs.existsSync(TOKEN_CACHE_PATH)) return null;
  try {
    const cache = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH));
    if (Date.now() > cache.expiresAt) return null;
    return cache.accessToken;
  } catch { return null; }
}

function saveTokenCache(token, expiresInSeconds) {
  fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify({
    accessToken: token,
    expiresAt: Date.now() + (expiresInSeconds - 300) * 1000,
    savedAt: new Date().toISOString()
  }, null, 2));
}

async function getAccessToken() {
  const cached = loadTokenCache();
  if (cached) { console.log('[Auth] cache hit'); return cached; }
  const { SHOPIFY_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = process.env;
  if (!SHOPIFY_DOMAIN || !SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET)
    throw new Error('חסרים משתני סביבה!');
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' })
  });
  if (!res.ok) throw new Error(`Auth error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  saveTokenCache(data.access_token, data.expires_in || 86400);
  console.log('[Auth] טוקן חדש התקבל');
  return data.access_token;
}

async function shopifyRequest(endpoint, method = 'GET', body = null) {
  const token = await getAccessToken();
  const base = `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2024-01`;
  const res = await fetch(`${base}${endpoint}`, {
    method,
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null
  });
  if (res.status === 401) {
    fs.existsSync(TOKEN_CACHE_PATH) && fs.unlinkSync(TOKEN_CACHE_PATH);
    return shopifyRequest(endpoint, method, body);
  }
  if (!res.ok) throw new Error(`Shopify error: ${res.status}`);
  return res.json();
}

module.exports = { getAccessToken, shopifyRequest };
