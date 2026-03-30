# Infrastructure Knowledge Base

## Server
- IP: 34.31.6.152 | User: friends7777wolfs | GCP
- PM2 binary: ~/OpenClawMaster/discord-bridge/node_modules/.bin/pm2
- Env file: /home/friends7777wolfs/OpenClawMaster/discord-bridge/.env

## PM2 Processes
| ID | Name | Role |
|----|------|------|
| 1 | reporter | daily/weekly report |
| 2 | tg-userbot | reads 29 TG channels |
| 4 | tg-bot | interactive bot |
| 6 | discord-bridge | 22 Discord channels |
| 7 | intelligence | AI analysis 60min |
| 8 | self-improve | auto-fix 2h |
| 13 | swarm | 30 agents voting |

## Nginx
- Dashboard: http://34.31.6.152 (port 80)
- Diagnostic: port 3001 (NOT open in GCP firewall yet)
