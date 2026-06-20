// PM2 进程管理配置
// 使用方式：pm2 start deploy/ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'rungoal-server',
      cwd: '/opt/rungoal/apps/server',
      script: 'dist/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/rungoal/error.log',
      out_file: '/var/log/rungoal/out.log',
      merge_logs: true,
      // 自动重启间隔（ms），防止崩溃后疯狂重启
      restart_delay: 3000,
      // 最大重启次数
      max_restarts: 10,
    },
  ],
};
