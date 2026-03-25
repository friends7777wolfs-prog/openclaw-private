cd ~/OpenClawMaster
screen -dmS openclaw node agent.js
screen -dmS openclaw2 node agent2.js
screen -dmS react node self_improve.js
screen -dmS budget node budget_manager.js
echo "started $(date)" >> startup.log
