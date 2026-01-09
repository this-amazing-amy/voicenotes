module.exports = {
  apps: [
    {
      name: "audio-transcriber",
      script: "./out/main.js",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 30000,
      wait_ready: true,
      listen_timeout: 10000,
      exp_backoff_restart_delay: 100,
      disable_logs: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
