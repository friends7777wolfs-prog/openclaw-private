const fs = require('fs');
let code = fs.readFileSync('scanner.js', 'utf8');

// החלף את fetchTweets לגרסה עמידה
const newFetch = `async function fetchTweets(userId, sinceId) {
  const params = {
    max_results: 5,
    'tweet.fields': 'created_at,text,public_metrics',
    exclude: 'retweets,replies'
  };
  if (sinceId) params.since_id = sinceId;
  
  const res = await axios.get(
    \`https://api.twitter.com/2/users/\${userId}/tweets\`,
    { 
      headers: { Authorization: \`Bearer \${process.env.TWITTER_BEARER_TOKEN.trim()}\` }, 
      params,
      validateStatus: s => s < 500
    }
  );
  if (res.status !== 200) return [];
  return res.data?.data || [];
}`;

// מצא והחלף את הפונקציה
code = code.replace(/async function fetchTweets[\s\S]*?^}/m, newFetch);
fs.writeFileSync('scanner.js', code);
console.log('✅ fetchTweets עודכן');
