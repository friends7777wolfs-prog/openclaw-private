import asyncio
import aiohttp
import os
from telethon import TelegramClient, events
from dotenv import load_dotenv

load_dotenv('/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env')

API_ID   = int(os.getenv('TG_API_ID'))
API_HASH = os.getenv('TG_API_HASH')
SESSION  = '/home/friends7777wolfs/OpenClawMaster/discord-bridge/openclaw_userbot'
BRIDGE   = 'http://localhost:3001/tg-signal'

WATCH_CHANNELS = [int(x) for x in os.getenv('TG_WATCH_CHANNELS','').split(',') if x]

client = TelegramClient(SESSION, API_ID, API_HASH)

@client.on(events.NewMessage(chats=WATCH_CHANNELS))
async def handler(event):
  msg = event.message
  if not msg.text: return
  try:
    chat    = await event.get_chat()
    channel = getattr(chat, 'title', 'unknown')
    print(f'📨 [{channel}]: {msg.text[:60]}')
    async with aiohttp.ClientSession() as session:
      await session.post(BRIDGE, json={
        'content': msg.text,
        'channel': channel,
        'source':  'telegram'
      }, timeout=aiohttp.ClientTimeout(total=5))
  except Exception as e:
    print(f'❌ {e}')

async def main():
  await client.start()
  me = await client.get_me()
  print(f'✅ מחובר: {me.username}')
  print(f'👂 מאזין ל-{len(WATCH_CHANNELS)} ערוצים')
  await client.run_until_disconnected()

asyncio.run(main())
