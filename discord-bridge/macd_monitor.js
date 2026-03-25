require('./load_env');
const MetaApi = require('metaapi.cloud-sdk').default;

const api = new MetaApi(process.env.METAAPI_TOKEN);
let connection   = null;
let account      = null;

// עסקאות שכבר צומצמו — למניעת כפילות
const reducedTrades = new Set();

async function getConn() {
  if (connection) return connection;
  account    = await api.metatraderAccountApi.getAccount(process.env.METAAPI_ACCOUNT_ID);
  if (account.state !== 'DEPLOYED') await account.deploy();
  await account.waitConnected();
  connection = account.getRPCConnection();
  await connection.connect();
  await connection.waitSynchronized();
  return connection;
}

// חישוב EMA
function ema(values, period) {
  const k = 2 / (period + 1);
  let result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i-1] * (1 - k));
  }
  return result;
}

// חישוב MACD מנרות
function calcMACD(candles, fast=12, slow=26, signal=9) {
  if (candles.length < slow + signal) return null;

  const closes  = candles.map(c => c.close);
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  // MACD line מתחיל מאינדקס slow-1
  const macdLine = emaFast.slice(slow - 1).map((v, i) => v - emaSlow[slow - 1 + i]);
  const signalLine = ema(macdLine, signal);

  // ערכים אחרונים
  const lastIdx  = signalLine.length - 1;
  const prevIdx  = lastIdx - 1;

  return {
    macd:        macdLine[macdLine.length - 1],
    signal:      signalLine[lastIdx],
    histogram:   macdLine[macdLine.length - 1] - signalLine[lastIdx],
    prevHistogram: macdLine[macdLine.length - 2] - signalLine[prevIdx],
  };
}

// בדיקת תנאי צמצום
function shouldReduce(macdData, direction) {
  if (!macdData) return false;
  const { histogram, prevHistogram } = macdData;

  if (direction === 'buy') {
    // Long: histogram ירד מתחת ל-signal (histogram < 0 אחרי שהיה > 0) וערכים > 0
    return prevHistogram > 0 && histogram < 0;
  } else {
    // Short: histogram עלה מעל signal (histogram > 0 אחרי שהיה < 0) וערכים < 0
    return prevHistogram < 0 && histogram > 0;
  }
}

// ניטור כל הפוזיציות הפתוחות
async function monitorPositions(telegramBot) {
  try {
    const conn      = await getConn();
    const positions = await conn.getPositions();

    if (positions.length === 0) return;

    for (const pos of positions) {
      // בדיקה שזו עסקה של OpenClaw
      if (!pos.comment?.includes('OpenClaw')) continue;

      const tradeKey = `${pos.id}_reduced`;
      if (reducedTrades.has(tradeKey)) continue;

      // שליפת נרות M1
      const candles = await conn.getHistoricalCandles(pos.symbol, '1m', new Date(Date.now() - 40 * 60000), new Date(), 35);
      if (!candles || candles.length < 30) continue;

      // חישוב MACD
      const macdData = calcMACD(candles);
      if (!macdData) continue;

      const direction = pos.type === 'POSITION_TYPE_BUY' ? 'buy' : 'sell';

      console.log(`📊 ${pos.symbol} ${direction} | MACD hist: ${macdData.histogram.toFixed(4)} (prev: ${macdData.prevHistogram.toFixed(4)})`);

      if (!shouldReduce(macdData, direction)) continue;

      // צמצום ב-25%
      const reduceVolume = Math.round(pos.volume * 0.25 * 100) / 100;
      if (reduceVolume < 0.01) continue;

      console.log(`⚡ צמצום ${pos.symbol} ב-${reduceVolume} lots (25%)`);

      try {
        // סגירת 25% מהפוזיציה
        await conn.closePositionPartially(pos.id, reduceVolume);

        // הזזת SL ל-BreakEven על החלק הנשאר
        const newSL = pos.openPrice;
        await conn.modifyPosition(pos.id, newSL, pos.takeProfit);

        reducedTrades.add(tradeKey);

        console.log(`✅ צומצם: ${pos.symbol} | SL → BreakEven @ ${newSL}`);

        // הודעה לטלגרם
        if (telegramBot) {
          const msg = `⚡ *צמצום אוטומטי*\n` +
            `📉 MACD: מומנטום נחלש\n` +
            `🎯 ${pos.symbol} | ${direction.toUpperCase()}\n` +
            `📊 נסגר: ${reduceVolume} lots (25%)\n` +
            `🔒 SL → BreakEven @ ${newSL}`;
          await telegramBot.api.sendMessage(process.env.TELEGRAM_CHAT_ID, msg, {
            parse_mode: 'Markdown'
          });
        }

      } catch (err) {
        console.error(`❌ צמצום נכשל: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('❌ monitor error:', err.message);
  }
}

module.exports = { monitorPositions };
