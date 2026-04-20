module.exports = {
  apps: [
    {
      name: "elh-backend",
      script: "server.js",
      cwd: ".",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      min_uptime: "10s",
      max_restarts: 20,
      restart_delay: 3000,
      kill_timeout: 10000,
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
