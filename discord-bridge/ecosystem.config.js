module.exports = {
  apps: [
    {
      name: 'discord-bridge',
      script: 'bridge.js',
      cwd: '/home/friends7777wolfs/OpenClawMaster/discord-bridge',
      watch: false,
      max_memory_restart: '300M',
      restart_delay: 5000,
      max_restarts: 10,
      out_file: 'bridge.log',
      error_file: 'bridge-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'reporter',
      script: 'reporter.js',
      cwd: '/home/friends7777wolfs/OpenClawMaster/discord-bridge',
      watch: false,
      restart_delay: 5000
    }
  ]
};
// נוסף ידנית — ראה פקודה למטה
