require('dotenv').config();
const fs = require('fs');
const tg = require('./telegram');
const ai = require('./ai_brain');

const TOTAL_BUDGET = 50;
const MAX_PER_3_DAYS = 10;
const BUDGET_FILE = './budget.json';

function loadBudget() {
  if (!fs.existsSync(BUDGET_FILE)) {
    return { total: TOTAL_BUDGET, spent: 0, last_reset: new Date().toISOString(), transactions: [], period_spent: 0, period_start: new Date().toISOString() };
  }
  return JSON.parse(fs.readFileSync(BUDGET_FILE));
}

function saveBudget(b) { fs.writeFileSync(BUDGET_FILE, JSON.stringify(b, null, 2)); }

function shouldResetPeriod(budget) {
  const daysSince = (Date.now() - new Date(budget.period_start).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 3;
}

async function planSpending(budget, storeStats) {
  const available = MAX_PER_3_DAYS - budget.period_spent;
  if (available <= 0) return null;
  const raw = await ai.weeklyStrategy({
    task: 'plan marketing spending to maximize ROI',
    available_budget: available,
    store_stats: storeStats,
    options: [
      { name: 'Kling AI video', cost: 10, expected_roi: 'viral video = 50-200 visitors' },
      { name: 'Canva Pro month', cost: 5, expected_roi: 'better product images = 15% more conversions' },
      { name: 'ElevenLabs voice', cost: 5, expected_roi: 'professional voiceover for videos' },
      { name: 'Facebook boost post', cost: 10, expected_roi: '1000-3000 targeted impressions' },
      { name: 'Save for next period', cost: 0, expected_roi: 'accumulate for bigger impact' }
    ],
    rule: 'only spend if expected revenue > 3x cost, explain ROI clearly'
  });
  try { return JSON.parse(raw); }
  catch { return null; }
}

async function runBudgetCycle() {
  const budget = loadBudget();
  if (shouldResetPeriod(budget)) {
    budget.period_spent = 0;
    budget.period_start = new Date().toISOString();
    saveBudget(budget);
    console.log('[Budget] תקופה חדשה — תקציב מתאפס');
  }

  const remaining = budget.total - budget.spent;
  const periodAvailable = MAX_PER_3_DAYS - budget.period_spent;

  if (remaining <= 0 || periodAvailable <= 0) {
    await tg.sendMessage('תקציב: נגמר לתקופה זו\nנשאר כולל: $' + remaining.toFixed(2) + '\nזמין ל-3 ימים: $' + periodAvailable.toFixed(2));
    return;
  }

  const SHOP = process.env.SHOPIFY_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  const [productsData, ordersData] = await Promise.all([
    fetch('https://' + SHOP + '/admin/api/2024-01/products/count.json', { headers: { 'X-Shopify-Access-Token': TOKEN } }).then(r => r.json()),
    fetch('https://' + SHOP + '/admin/api/2024-01/orders.json?status=any&limit=50', { headers: { 'X-Shopify-Access-Token': TOKEN } }).then(r => r.json())
  ]);
  const revenue = ordersData.orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);

  const plan = await planSpending(budget, {
    products: productsData.count,
    orders: ordersData.orders.length,
    revenue: revenue.toFixed(2),
    period_available: periodAvailable
  });

  if (!plan || !plan.actions || plan.actions.length === 0) return;

  const topAction = plan.actions[0];
  if (!topAction || topAction.type === 'save') {
    await tg.sendMessage('תקציב: AI החליט לחסוך\nנימוק: ' + (plan.pricing || 'ROI לא מספיק כרגע'));
    return;
  }

  const cost = parseFloat(topAction.cost || 0);
  if (cost > periodAvailable) {
    await tg.sendMessage('תקציב: רוצה להוציא $' + cost + ' אבל יש רק $' + periodAvailable.toFixed(2) + '\nממתין לתקופה הבאה');
    return;
  }

  if (cost <= periodAvailable && cost <= MAX_PER_3_DAYS) {
    budget.period_spent += cost;
    budget.spent += cost;
    budget.transactions.unshift({
      date: new Date().toISOString(),
      amount: cost,
      purpose: topAction.type || 'marketing',
      reasoning: plan.pricing || ''
    });
    saveBudget(budget);
    await tg.sendMessage('הוצאה אוטומטית!\nסכום: $' + cost + '\nמטרה: ' + (topAction.type || 'marketing') + '\nנימוק: ' + (plan.pricing || '').substring(0, 200) + '\n\nנשאר לתקופה: $' + (MAX_PER_3_DAYS - budget.period_spent).toFixed(2) + '\nנשאר כולל: $' + (TOTAL_BUDGET - budget.spent).toFixed(2) + '\n\nלתשלום: שלח $' + cost + ' ל: [הכנס PayPal/Payoneer שלך]');
  }
}

const cron = require('node-cron');
cron.schedule('0 10 */3 * *', runBudgetCycle);
runBudgetCycle();
console.log('מנהל תקציב פעיל - $10 כל 3 ימים מתוך $50');
