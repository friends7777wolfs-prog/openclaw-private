/**
 * Dream Scheduler — מריץ dream.js כל לילה ב-02:00
 */
const { execSync } = require('child_process');

function scheduleDream() {
  const now = new Date();
  const dreamHour = 2; // 02:00 לילה
  const next = new Date();
  next.setHours(dreamHour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const msUntil = next - now;
  const hoursUntil = (msUntil / 3600000).toFixed(1);
  console.log(`🌙 Dream scheduled in ${hoursUntil}h (at ${next.toISOString().slice(11,16)})`);

  setTimeout(() => {
    console.log('🌙 Starting nightly dream...');
    try {
      execSync('node /home/friends7777wolfs/OpenClawMaster/memory/dream.js', { stdio: 'inherit' });
    } catch(e) {
      console.error('Dream failed:', e.message);
    }
    scheduleDream(); // schedule next night
  }, msUntil);
}

scheduleDream();
