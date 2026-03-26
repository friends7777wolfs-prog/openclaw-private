require('./load_env');
const axios = require('axios');

const META_TOKEN = process.env.METAAPI_TOKEN;
const ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID;
const BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai';

const SYMBOL_MAP = {
  // אינדקסים — מאומת
  'NAS100': 'USTEC',
  'SP500':  'US500',
  'US30':   'US30',
  'DE40':   'DE40',
  'UK100':  'UK100',
  'JP225':  'JP225',
  'AU200':  'AUS200',
  // מתכות — מאומת
  'XAUUSD': 'XAUUSD',
  'XAGUSD': 'XAGUSD',
  // פורקס — מאומת
  'EURUSD': 'EURUSD',
  'GBPUSD': 'GBPUSD',
  'USDJPY': 'USDJPY',
  'USDCHF': 'USDCHF',
  'AUDUSD': 'AUDUSD',
  'USDCAD': 'USDCAD',
  'GBPJPY': 'GBPJPY',
  'EURJPY': 'EURJPY',
  // קריפטו
  'BTCUSD': null,
  'ETHUSD': null,
  // fallback
  'ALL':    'XAUUSD',
  'NONE':   null,
};

async function getPrice(symbol) {
  const res = await axios.get(
    `${BASE}/users/current/accounts/${ACCOUNT_ID}/symbols/${symbol}/current-price`,
    { headers: { 'auth-token': META_TOKEN } }
  );
  return res.data;
}

async function executeTrade({ asset, direction, riskPercent, comment }) {
  const symbol = SYMBOL_MAP[asset];
  if (!symbol) {
    console.log(`[MT5] skip — ${asset} לא זמין`);
    return null;
  }
  const accountRes = await axios.get(
    `${BASE}/users/current/accounts/${ACCOUNT_ID}/account-information`,
    { headers: { 'auth-token': META_TOKEN } }
  );
  const balance = accountRes.data.balance;
  const riskAmount = balance * ((riskPercent || 0.1) / 100);
  const price = await getPrice(symbol);
  const currentPrice = direction === 'BUY' ? price.ask : price.bid;
  const slPips = currentPrice * 0.01;
  const sl = direction === 'BUY' ? currentPrice - slPips : currentPrice + slPips;
  const tp = direction === 'BUY' ? currentPrice + slPips * 2 : currentPrice - slPips * 2;
  const volume = Math.max(0.01, Math.min(0.5, riskAmount / (slPips * 100)));
  const order = {
    symbol,
    actionType: direction === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    volume: parseFloat(volume.toFixed(2)),
    stopLoss: parseFloat(sl.toFixed(2)),
    takeProfit: parseFloat(tp.toFixed(2)),
    comment: (comment || 'twitter').substring(0, 25),
  };
  console.log(`[MT5] ${direction} ${symbol} vol:${order.volume} sl:${order.stopLoss} tp:${order.takeProfit}`);
  const res = await axios.post(
    `${BASE}/users/current/accounts/${ACCOUNT_ID}/trade`,
    order,
    { headers: { 'auth-token': META_TOKEN, 'Content-Type': 'application/json' } }
  );
  const result = res.data;
  if (result?.stringCode === 'SYMBOL_TRADE_MODE_DISABLED') {
    console.log(`[MT5] ⚠️ ${symbol} disabled`);
    return null;
  }
  console.log(`[MT5] ✅ orderId: ${result?.orderId || JSON.stringify(result)}`);
  return result;
}

module.exports = { executeTrade, getPrice };
