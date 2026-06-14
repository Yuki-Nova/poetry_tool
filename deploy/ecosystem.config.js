module.exports = {
  apps: [
    {
      name: 'poetry-server',
      script: './app.js',
      cwd: '/var/www/poetry-tool/server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      autorestart: true,
      max_memory_restart: '200M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/www/poetry-tool/server/logs/err.log',
      out_file: '/var/www/poetry-tool/server/logs/out.log',
      merge_logs: true
    }
  ]
}
