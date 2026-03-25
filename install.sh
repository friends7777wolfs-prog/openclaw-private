#!/bin/bash
echo "🦞 OpenClaw Installation Script"
echo "================================"

# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs python3 python3-pip zip

# Python deps
python3 -m pip install telethon aiohttp python-dotenv --break-system-packages

# npm install בכל תיקייה
for dir in discord-bridge signal-tracker intelligence self-improve; do
  if [ -d "$dir" ]; then
    echo "📦 מתקין $dir..."
    cd $dir && npm install && cd ..
  fi
done

# העתק .env.example
cp discord-bridge/.env.example discord-bridge/.env
echo ""
echo "✅ התקנה הושלמה!"
echo "⚠️  עכשיו מלא את הערכים ב: discord-bridge/.env"
echo "לאחר מכן הפעל: cd discord-bridge && ./node_modules/.bin/pm2 start ecosystem.config.js"
