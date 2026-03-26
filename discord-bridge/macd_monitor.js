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
  // TODO: replace getHistoricalCandles with correct SDK method
  return;
}

module.exports = { monitorPositions };
