module.exports = {
  apps: [
    {
      name: 'poetry-server',
      script: './app.js',
      cwd: '/www/wwwroot/poetry/server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      autorestart: true,
      max_memory_restart: '200M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/www/wwwroot/poetry/server/logs/err.log',
      out_file: '/www/wwwroot/poetry/server/logs/out.log',
      merge_logs: true
    }
  ]
}
