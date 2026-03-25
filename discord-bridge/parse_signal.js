const { smartDetectAsset } = require('./asset_detector');

function enrichSignal(signalText, channelName, rawContent) {
  const lines = signalText.split('\n');
  const get   = (key) => {
    const l = lines.find(l => l.startsWith(key));
    return l ? l.split(':').slice(1).join(':').trim() : null;
  };

  const currency = get('Currency');
  const entry    = get('Entering price');

  // זיהוי חכם של נכס
  const realAsset = smartDetectAsset(currency, entry, channelName, rawContent);

  // החלפה בשורה
  const enriched = signalText.replace(
    /^Currency:.*$/m,
    `Currency: ${realAsset}`
  );

  return enriched;
}

module.exports = { enrichSignal };
