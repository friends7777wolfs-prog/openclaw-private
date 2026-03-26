// מיפוי סימבולים לפי ברוקר — מתעדכן אוטומטית
module.exports = {
  // MetaAPI Demo (ברוקר נוכחי)
  demo: {
    XAUUSD: 'XAUUSD',
    NAS100: null,   // Trade disabled
    SP500: null,    // Trade disabled
  },
  // FTMO — יתעדכן כשתתחבר
  ftmo: {
    XAUUSD: 'XAUUSD',
    NAS100: 'NAS100.cash',
    SP500: 'US500.cash',
  }
};
