require('./load_env');
const MetaApi = require('metaapi.cloud-sdk').default;
const { toMT5Symbol } = require('./symbol_map');
const { detectAsset } = require('./asset_detector');
const { calcAutoSL, calcPositionSize } = require('./position_manager');
const { canTrade, getChannelRisk } = require('./risk_manager');

let connection  = null;
let accountBal  = 10000; // יתעדכן מMT5

async function getConnection() {
  if (connection) return connection;

  const api     = new MetaApi(process.env.METAAPI_TOKEN);
  const account = await api.metatraderAccountApi.getAccount(process.env.METAAPI_ACCOUNT_ID);

  if (account.state !== 'DEPLOYED') await account.deploy();
  await account.waitConnected();

  connection = account.getStreamingConnection();
  await connection.connect();
  await connection.waitSynchronized();

  // קבלת יתרה אמיתית
  try {
    const info = await connection.getAccountInformation();
    accountBal  = info.balance;
    console.log(`✅ MT5 מחובר | יתרה: $${accountBal}`);
  } catch(e) {
    console.log(`✅ MT5 מחובר | יתרה ברירת מחדל: $${accountBal}`);
  }

  return connection;
}

async function executeTrade(signalText, channelName) {
  try {
    // 1. בדיקת daily limit
    const tradeCheck = canTrade(accountBal);
    if (!tradeCheck.allowed) {
      console.log(`🛑 ${tradeCheck.reason}`);
      return { blocked: true, reason: tradeCheck.reason };
    }

    // 2. זיהוי נכס
    const asset = detectAsset(signalText, channelName);
    if (!asset) { console.log('⚠️ לא זוהה נכס'); return null; }
    console.log(`🎯 נכס: ${asset.symbol} → MT5: ${asset.mt5}`);

    // 3. חילוץ פרמטרים
    const get = (key) => {
      const m = signalText.match(new RegExp(key + ':\\s*([^\\n]+)'));
      const v = m ? m[1].trim() : null;
      return v === 'N/A' || !v ? null : v;
    };

    const entryRaw   = get('Entering price');
    const tp1Raw     = get('Take profit 1');
    const slRaw      = get('Stop loss');
    const direction  = get('Buy or Sell');
    const actionType = get('Action_type');

    if (!entryRaw) {
      console.log('⚠️ אין מחיר כניסה');
      return null;
    }

    const entry  = parseFloat(entryRaw);
    const tp1    = tp1Raw ? parseFloat(tp1Raw) : null;
    const isBuy  = direction === 'Buy' ||
                   (actionType || '').toLowerCase().includes('long') ||
                   (actionType || '').toLowerCase().includes('up');

    // 4. SL — מסיגנל או ATR אוטומטי
    let sl = slRaw ? parseFloat(slRaw) : calcAutoSL(entry, isBuy ? 'buy' : 'sell', asset);
    console.log(`📍 SL: ${sl} (${slRaw ? 'מסיגנל' : 'ATR אוטומטי'})`);

    // 5. גודל פוזיציה לפי % סיכון
    const riskPct = getChannelRisk(channelName);
    const lots    = calcPositionSize(accountBal, riskPct, entry, sl, asset);
    console.log(`💰 Risk: ${riskPct.toFixed(2)}% | Lots: ${lots}`);

    // 6. פתיחת עסקה
    const conn   = await getConnection();
    // שלח בלי SL/TP — MT5 דמו דוחה stops ישנים מהסיגנל
    const result = isBuy
      ? await conn.createMarketBuyOrder(asset.mt5, lots, null, null, { comment: `OpenClaw|${channelName.slice(0,10)}` })
      : await conn.createMarketSellOrder(asset.mt5, lots, null, null, { comment: `OpenClaw|${channelName.slice(0,10)}` });

    console.log(`✅ עסקה: ${asset.mt5} ${isBuy?'BUY':'SELL'} ${lots} | Ticket: ${result.orderId}`);
    // שלח הודעה לטלגרם
    try {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId  = process.env.TELEGRAM_CHAT_ID;
      if (tgToken && chatId) {
        const msg = encodeURIComponent(`✅ עסקה נפתחה!\n${asset.mt5} ${isBuy?'🟢 BUY':'🔴 SELL'} | ${lots} lots\nSL: ${sl} | TP: ${tp1}\nChannel: ${channelName}\nTicket: ${result.orderId}`);
        require('https').get(`https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${chatId}&text=${msg}`).on('error',()=>{});
      }
    } catch(e) {}
    return { ...result, lots, riskPct, asset, sl };

  } catch (err) {
    console.error('❌ MT5:', err.message);
    return null;
  }
}

module.exports = { executeTrade };
