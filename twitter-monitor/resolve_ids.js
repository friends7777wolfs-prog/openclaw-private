require('./load_env');
const axios = require('axios');
const fs = require('fs');
const influencers = require('./influencers_raw');

async function resolveIds() {
  const BEARER = process.env.TWITTER_BEARER_TOKEN;
  const result = [];
  
  // batch של 100 בכל בקשה
  const BATCH = 100;
  for (let i = 0; i < influencers.length; i += BATCH) {
    const batch = influencers.slice(i, i + BATCH);
    const usernames = batch.map(u => u.handle).join(',');
    
    try {
      const res = await axios.get('https://api.twitter.com/2/users/by', {
        headers: { Authorization: `Bearer ${BEARER}` },
        params: { usernames, 'user.fields': 'id,name,username,public_metrics' }
      });
      
      const users = res.data?.data || [];
      for (const user of users) {
        const meta = influencers.find(i => 
          i.handle.toLowerCase() === user.username.toLowerCase()
        );
        result.push({
          id: user.id,
          name: user.name,
          handle: user.username,
          followers: user.public_metrics?.followers_count || 0,
          ...meta
        });
        console.log(`✅ ${user.username} → ID: ${user.id} (${(user.public_metrics?.followers_count/1e6).toFixed(1)}M followers)`);
      }
    } catch(e) {
      console.error(`❌ batch ${i}: ${e.response?.status} ${e.response?.data?.title}`);
    }
    
    await new Promise(r => setTimeout(r, 1000)); // rate limit
  }
  
  // מיין לפי weight ואז followers
  result.sort((a,b) => (b.weight - a.weight) || (b.followers - a.followers));
  
  fs.writeFileSync('./data/influencers.json', JSON.stringify(result, null, 2));
  console.log(`\n✅ שמרתי ${result.length} משפיעים ל-data/influencers.json`);
  
  // סטטיסטיקות
  const cats = {};
  result.forEach(r => cats[r.cat] = (cats[r.cat]||0)+1);
  console.log('\nלפי קטגוריה:', JSON.stringify(cats, null, 2));
}

resolveIds().catch(console.error);
