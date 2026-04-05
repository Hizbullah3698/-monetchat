// PM2 Ecosystem Configuration for PickPic
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: "pickpic",
      // Use Next.js binary directly
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
