// PM2 进程管理配置
// 使用方式：pm2 start deploy/ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'rungoal-server',
      cwd: '/var/www/rungoal/apps/server',
      script: 'dist/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // 日志
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/rungoal/error.log',
      out_file: '/var/log/rungoal/out.log',
      merge_logs: true,
    },
  ],
};
