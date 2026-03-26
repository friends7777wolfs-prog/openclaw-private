const http  = require('http');
const { execSync } = require('child_process');
const PM2   = '/home/friends7777wolfs/OpenClawMaster/discord-bridge/node_modules/.bin/pm2';
const TOKEN = process.env.DIAG_TOKEN || 'openclaw-diag-2026';

http.createServer((req, res) => {
  // בדוק token
  const url = new URL(req.url, 'http://localhost');
  if (url.searchParams.get('token') !== TOKEN) {
    res.writeHead(403); res.end('forbidden'); return;
  }

  const action = url.pathname.replace('/', '') || 'status';

  try {
    let out = '';
    if (action === 'status') {
      out = execSync(`${PM2} jlist 2>/dev/null`).toString();
      const procs = JSON.parse(out).map(p => ({
        name: p.name, id: p.pm_id, status: p.pm2_env.status,
        restarts: p.pm2_env.restart_time, memory: Math.round(p.monit.memory/1024/1024) + 'mb',
        cpu: p.monit.cpu + '%'
      }));
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:true, processes: procs}, null, 2));

    } else if (action === 'logs') {
      const name = url.searchParams.get('proc') || 'discord-bridge';
      const lines = url.searchParams.get('lines') || '50';
      out = execSync(`${PM2} logs ${name} --lines ${lines} --nostream 2>&1`).toString();
      // סנן noise
      const clean = out.split('\n')
        .filter(l => !l.match(/dotenv|websocket|sticky|scheduling|Connecting|london|MetaApi|clientSticky|Emitter|callListener|onpacket|Manager|onevent|injecting/))
        .join('\n');
      res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'});
      res.end(clean);

    } else if (action === 'errors') {
      const name = url.searchParams.get('proc') || 'discord-bridge';
      out = execSync(`${PM2} logs ${name} --lines 100 --nostream 2>&1`).toString();
      const errors = out.split('\n').filter(l => l.includes('❌') || l.includes('Error') || l.includes('error')).join('\n');
      res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'});
      res.end(errors || 'no errors ✅');

    } else if (action === 'trades') {
      out = execSync(`${PM2} logs discord-bridge --lines 200 --nostream 2>&1`).toString();
      const trades = out.split('\n').filter(l => l.includes('✅ עסקה') || l.includes('🛑') || l.includes('💰') || l.includes('🎯 נכס')).join('\n');
      res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'});
      res.end(trades || 'no trades yet');

    } else {
      res.writeHead(404); res.end('unknown action');
    }
  } catch(e) {
    res.writeHead(500, {'Content-Type':'text/plain'});
    res.end('error: ' + e.message);
  }
}).listen(3001, () => console.log('🔍 Diag server :3001'));
