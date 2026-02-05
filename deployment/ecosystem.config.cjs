module.exports = {
  apps: [
    {
      name: 'nextjs-backend',
      script: 'npm',
      args: 'run start',
      cwd: '/home/deploy/final-project-backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/nextjs-error.log',
      out_file: './logs/nextjs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'medication-cron-worker',
      script: 'npx',
      args: 'tsx server/workers/medicationCron.worker.ts',
      cwd: '/home/deploy/final-project-backend',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/medication-cron-error.log',
      out_file: './logs/medication-cron-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'antivirus-daemon',
      script: './scripts/antivirus_daemon.sh',
      cwd: '/home/deploy/final-project-backend',
      interpreter: '/bin/bash',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/antivirus-error.log',
      out_file: './logs/antivirus-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true
    }
  ]
};
