require('./load_env');
const axios = require('axios');
const fs = require('fs');

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TRUMP_USER_ID = '25073877'; // @realDonaldTrump
const STATE_FILE = './last_tweet_id.txt';
const SIGNAL_PIPE = '../discord-bridge/signal_injector.js';

function loadLastId() {
  try { return fs.readFileSync(STATE_FILE, 'utf8').trim(); } catch { return null; }
}
function saveLastId(id) { fs.writeFileSync(STATE_FILE, id); }

async function fetchNewTweets() {
  const lastId = loadLastId();
  const params = {
    max_results: 5,
    'tweet.fields': 'created_at,text',
    exclude: 'retweets,replies'
  };
  if (lastId) params.since_id = lastId;

  const res = await axios.get(
    `https://api.twitter.com/2/users/${TRUMP_USER_ID}/tweets`,
    {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
      params
    }
  );

  const tweets = res.data?.data || [];
  if (tweets.length > 0) {
    saveLastId(tweets[0].id);
    console.log(`[twitter] ${tweets.length} ציוצים חדשים`);
  }
  return tweets;
}

async function analyzeTweet(text) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `אתה מנתח ציוצים של טראמפ לסיגנלים פיננסיים.
החזר JSON בלבד:
{
  "signal": "BUY"|"SELL"|"NONE",
  "asset": "NAS100"|"SP500"|"XAUUSD"|"BTCUSD"|"NONE",
  "confidence": 0-100,
  "reason": "מקסימום 10 מילים"
}
מילות מפתח: tariff/trade war → SELL NAS100/SP500 | crypto/bitcoin → BUY BTCUSD | gold/safe → BUY XAUUSD | economy great/jobs → BUY NAS100`,
      messages: [{ role: 'user', content: `Tweet: "${text}"` }]
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    }
  );
  const raw = res.data.content[0].text;
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

async function run() {
  console.log('[twitter-monitor] 🐦 מאזין לחשבון טראמפ...');
  const tweets = await fetchNewTweets();
  for (const tweet of tweets) {
    console.log(`[tweet] ${tweet.text.substring(0, 80)}...`);
    const analysis = await analyzeTweet(tweet.text);
    console.log('[analysis]', JSON.stringify(analysis));
    if (analysis.signal !== 'NONE' && analysis.confidence >= 60) {
      const injector = require(SIGNAL_PIPE);
      await injector.inject({
        source: 'twitter-trump',
        text: `Trump tweet signal: ${analysis.asset} ${analysis.signal} (${analysis.confidence}%) — ${analysis.reason}`,
        asset: analysis.asset,
        direction: analysis.signal
      });
      console.log(`[twitter] ✅ סיגנל הוזרק: ${analysis.asset} ${analysis.signal}`);
    }
  }
}

// הרץ כל 2 דקות
run().catch(console.error);
setInterval(() => run().catch(console.error), 120_000);
