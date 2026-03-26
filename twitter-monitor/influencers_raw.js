// 200 המשפיעים הגדולים — לפי קטגוריה ומשקל
module.exports = [
  // ═══ TIER 1: MARKET MOVERS (משקל 10) ═══
  { handle: 'realDonaldTrump',  cat: 'POLITICS',   weight: 10, assets: ['SP500','NAS100'] },
  { handle: 'elonmusk',         cat: 'TECH_CEO',   weight: 10, assets: ['BTCUSD','TSLA','NAS100'] },
  { handle: 'federalreserve',   cat: 'CENTRAL_BANK', weight: 10, assets: ['ALL'] },
  { handle: 'JPMorgan',         cat: 'BANK',       weight: 9,  assets: ['SP500','XAUUSD'] },
  { handle: 'GoldmanSachs',     cat: 'BANK',       weight: 9,  assets: ['SP500','XAUUSD'] },

  // ═══ TIER 2: TOP INVESTORS ═══
  { handle: 'BillAckman',       cat: 'HEDGE_FUND', weight: 9,  assets: ['SP500'] },
  { handle: 'RayDalio',         cat: 'HEDGE_FUND', weight: 9,  assets: ['XAUUSD','SP500'] },
  { handle: 'michael_saylor',   cat: 'CRYPTO',     weight: 9,  assets: ['BTCUSD'] },
  { handle: 'CathieDWood',      cat: 'FUND',       weight: 8,  assets: ['NAS100','BTCUSD'] },
  { handle: 'chamath',          cat: 'VC',         weight: 8,  assets: ['NAS100','BTCUSD'] },
  { handle: 'paulg',            cat: 'VC',         weight: 7,  assets: ['NAS100'] },

  // ═══ TIER 2: CENTRAL BANKERS ═══
  { handle: 'Lagarde',          cat: 'CENTRAL_BANK', weight: 9, assets: ['EURUSD','SP500'] },
  { handle: 'KazuoUeda3',       cat: 'CENTRAL_BANK', weight: 8, assets: ['USDJPY'] },
  { handle: 'andyHaldane',      cat: 'ECONOMIST',  weight: 7,  assets: ['SP500'] },

  // ═══ TIER 2: TECH CEOs ═══
  { handle: 'JeffBezos',        cat: 'TECH_CEO',   weight: 8,  assets: ['NAS100'] },
  { handle: 'satyanadella',     cat: 'TECH_CEO',   weight: 8,  assets: ['NAS100'] },
  { handle: 'sundarpichai',     cat: 'TECH_CEO',   weight: 8,  assets: ['NAS100'] },
  { handle: 'tim_cook',         cat: 'TECH_CEO',   weight: 8,  assets: ['NAS100'] },
  { handle: 'jensenhuang',      cat: 'TECH_CEO',   weight: 9,  assets: ['NAS100'] },
  { handle: 'sama',             cat: 'AI',         weight: 8,  assets: ['NAS100','BTCUSD'] },
  { handle: 'demishassabis',    cat: 'AI',         weight: 7,  assets: ['NAS100'] },
  { handle: 'AnthropicAI',      cat: 'AI',         weight: 7,  assets: ['NAS100'] },

  // ═══ TIER 2: CRYPTO ═══
  { handle: 'cz_binance',       cat: 'CRYPTO',     weight: 8,  assets: ['BTCUSD'] },
  { handle: 'VitalikButerin',   cat: 'CRYPTO',     weight: 8,  assets: ['BTCUSD'] },
  { handle: 'brian_armstrong',  cat: 'CRYPTO',     weight: 7,  assets: ['BTCUSD'] },
  { handle: 'APompliano',       cat: 'CRYPTO',     weight: 7,  assets: ['BTCUSD'] },
  { handle: 'WClementeIII',     cat: 'CRYPTO',     weight: 7,  assets: ['BTCUSD'] },

  // ═══ TIER 3: ECONOMISTS ═══
  { handle: 'paulkrugman',      cat: 'ECONOMIST',  weight: 7,  assets: ['SP500'] },
  { handle: 'nouriel',          cat: 'ECONOMIST',  weight: 7,  assets: ['XAUUSD','SP500'] },
  { handle: 'LHSummers',        cat: 'ECONOMIST',  weight: 8,  assets: ['SP500'] },
  { handle: 'elinarimer',       cat: 'ECONOMIST',  weight: 6,  assets: ['SP500'] },
  { handle: 'Monetary_Mischief',cat: 'ECONOMIST',  weight: 6,  assets: ['XAUUSD'] },

  // ═══ TIER 3: FINANCIAL MEDIA ═══
  { handle: 'Bloomberg',        cat: 'MEDIA',      weight: 8,  assets: ['ALL'] },
  { handle: 'WSJ',              cat: 'MEDIA',      weight: 8,  assets: ['ALL'] },
  { handle: 'FT',               cat: 'MEDIA',      weight: 8,  assets: ['ALL'] },
  { handle: 'Reuters',          cat: 'MEDIA',      weight: 8,  assets: ['ALL'] },
  { handle: 'CNBCnow',          cat: 'MEDIA',      weight: 7,  assets: ['ALL'] },
  { handle: 'jimcramer',        cat: 'MEDIA',      weight: 6,  assets: ['SP500'] },

  // ═══ TIER 3: GEOPOLITICS ═══
  { handle: 'SecBlinken',       cat: 'POLITICS',   weight: 8,  assets: ['XAUUSD','OIL'] },
  { handle: 'POTUS',            cat: 'POLITICS',   weight: 9,  assets: ['ALL'] },
  { handle: 'NATO',             cat: 'GEOPOLITICS',weight: 8,  assets: ['XAUUSD'] },
  { handle: 'UN',               cat: 'GEOPOLITICS',weight: 7,  assets: ['XAUUSD'] },
  { handle: 'vonderleyen',      cat: 'POLITICS',   weight: 8,  assets: ['EURUSD'] },

  // ═══ TIER 3: OIL/ENERGY ═══
  { handle: 'OPECSecretariat',  cat: 'ENERGY',     weight: 9,  assets: ['XAUUSD'] },
  { handle: 'AramcoNews',       cat: 'ENERGY',     weight: 8,  assets: ['XAUUSD'] },
  { handle: 'Shell',            cat: 'ENERGY',     weight: 6,  assets: ['SP500'] },

  // ═══ TIER 4: TRADERS/ANALYSTS ═══
  { handle: 'zerohedge',        cat: 'TRADER',     weight: 7,  assets: ['XAUUSD','SP500'] },
  { handle: 'TaviCosta',        cat: 'MACRO',      weight: 7,  assets: ['XAUUSD','SP500'] },
  { handle: 'LukeGromen',       cat: 'MACRO',      weight: 7,  assets: ['XAUUSD'] },
  { handle: 'RaoulGMI',         cat: 'MACRO',      weight: 8,  assets: ['BTCUSD','XAUUSD'] },
  { handle: 'JulianMI2',        cat: 'MACRO',      weight: 7,  assets: ['SP500'] },
  { handle: 'JimRickards',      cat: 'MACRO',      weight: 7,  assets: ['XAUUSD'] },
  { handle: 'MacroAlf',         cat: 'MACRO',      weight: 7,  assets: ['SP500','EURUSD'] },
];
// ═══ 50 נוספים ═══
module.exports.push(...[
  // MACRO TRADERS
  { handle: 'StanleyDruckenmiller', cat: 'HEDGE_FUND', weight: 10, assets: ['SP500','XAUUSD'] },
  { handle: 'elerianmo',      cat: 'ECONOMIST',  weight: 9,  assets: ['SP500','EURUSD'] },
  { handle: 'darioperkins',   cat: 'MACRO',      weight: 8,  assets: ['SP500'] },
  { handle: 'profplum99',     cat: 'MACRO',      weight: 7,  assets: ['SP500','XAUUSD'] },
  { handle: 'AmbroseEP',      cat: 'MACRO',      weight: 7,  assets: ['XAUUSD','EURUSD'] },
  { handle: 'DiMartinoBooth', cat: 'MACRO',      weight: 8,  assets: ['SP500','XAUUSD'] },
  { handle: 'NickTimiraos',   cat: 'FED_WATCHER', weight: 9, assets: ['SP500','ALL'] },
  { handle: 'GregDaco',       cat: 'ECONOMIST',  weight: 7,  assets: ['SP500'] },
  { handle: 'IanShepherdson', cat: 'ECONOMIST',  weight: 7,  assets: ['SP500'] },
  { handle: 'lisaabramowicz1',cat: 'MEDIA',      weight: 8,  assets: ['SP500','XAUUSD'] },
  // CRYPTO
  { handle: 'CryptoHayes',    cat: 'CRYPTO',     weight: 8,  assets: ['BTCUSD'] },
  { handle: 'woonomic',       cat: 'CRYPTO',     weight: 8,  assets: ['BTCUSD'] },
  { handle: 'glassnode',      cat: 'CRYPTO',     weight: 7,  assets: ['BTCUSD'] },
  { handle: 'coinbase',       cat: 'CRYPTO',     weight: 7,  assets: ['BTCUSD'] },
  { handle: 'Blockworks_',    cat: 'CRYPTO',     weight: 7,  assets: ['BTCUSD'] },
  { handle: 'TuurDemeester',  cat: 'CRYPTO',     weight: 7,  assets: ['BTCUSD'] },
  { handle: '100trillionUSD', cat: 'CRYPTO',     weight: 8,  assets: ['BTCUSD'] },
  { handle: 'DocumentingBTC', cat: 'CRYPTO',     weight: 6,  assets: ['BTCUSD'] },
  // POLITICS / GEOPOLITICS
  { handle: 'SecYellen',      cat: 'POLITICS',   weight: 9,  assets: ['SP500','ALL'] },
  { handle: 'eucopresident',  cat: 'POLITICS',   weight: 8,  assets: ['EURUSD','SP500'] },
  { handle: 'SwedishPM',      cat: 'POLITICS',   weight: 6,  assets: ['EURUSD'] },
  { handle: 'MeloniGiorgia',  cat: 'POLITICS',   weight: 7,  assets: ['EURUSD'] },
  { handle: 'EmmanuelMacron', cat: 'POLITICS',   weight: 8,  assets: ['EURUSD','SP500'] },
  { handle: 'OlafScholz',     cat: 'POLITICS',   weight: 7,  assets: ['EURUSD'] },
  { handle: 'RishiSunak',     cat: 'POLITICS',   weight: 7,  assets: ['EURUSD'] },
  // ENERGY / COMMODITIES
  { handle: 'TaviCosta',      cat: 'MACRO',      weight: 8,  assets: ['XAUUSD','SP500'] },
  { handle: 'GrantWilliams_', cat: 'MACRO',      weight: 8,  assets: ['XAUUSD'] },
  { handle: 'KobeissiLetter', cat: 'TRADER',     weight: 8,  assets: ['SP500','NAS100'] },
  { handle: 'unusual_whales', cat: 'TRADER',     weight: 8,  assets: ['SP500','NAS100'] },
  { handle: 'DeItaone',       cat: 'MEDIA',      weight: 8,  assets: ['ALL'] },
  // FED / BANKS
  { handle: 'KashkariNeel',   cat: 'FED',        weight: 9,  assets: ['SP500','ALL'] },
  { handle: 'waller_fed',     cat: 'FED',        weight: 9,  assets: ['SP500','ALL'] },
  { handle: 'MorganStanley',  cat: 'BANK',       weight: 8,  assets: ['SP500','XAUUSD'] },
  { handle: 'CreditSuisse',   cat: 'BANK',       weight: 7,  assets: ['EURUSD','SP500'] },
  { handle: 'UBS',            cat: 'BANK',       weight: 7,  assets: ['EURUSD','SP500'] },
  { handle: 'citi',           cat: 'BANK',       weight: 8,  assets: ['SP500','EURUSD'] },
  // TECH / AI
  { handle: 'gdb',            cat: 'AI',         weight: 7,  assets: ['NAS100'] },
  { handle: 'ylecun',         cat: 'AI',         weight: 7,  assets: ['NAS100'] },
  { handle: 'drfeifei',       cat: 'AI',         weight: 7,  assets: ['NAS100'] },
  { handle: 'karpathy',       cat: 'AI',         weight: 7,  assets: ['NAS100'] },
  { handle: 'nvidia',         cat: 'TECH_CEO',   weight: 9,  assets: ['NAS100'] },
  { handle: 'intel',          cat: 'TECH_CEO',   weight: 7,  assets: ['NAS100'] },
  { handle: 'AMD',            cat: 'TECH_CEO',   weight: 7,  assets: ['NAS100'] },
  // MARKETS MEDIA
  { handle: 'markets',        cat: 'MEDIA',      weight: 8,  assets: ['ALL'] },
  { handle: 'MarketWatch',    cat: 'MEDIA',      weight: 7,  assets: ['ALL'] },
  { handle: 'TheTerminal_',   cat: 'MEDIA',      weight: 7,  assets: ['ALL'] },
  { handle: 'financialtimes', cat: 'MEDIA',      weight: 8,  assets: ['ALL'] },
  { handle: 'business',       cat: 'MEDIA',      weight: 7,  assets: ['ALL'] },
  { handle: 'EconomicTimes',  cat: 'MEDIA',      weight: 6,  assets: ['ALL'] },
  { handle: 'IMFNews',        cat: 'INSTITUTION', weight: 9, assets: ['ALL'] },
  { handle: 'WorldBank',      cat: 'INSTITUTION', weight: 8, assets: ['ALL'] },
]);
