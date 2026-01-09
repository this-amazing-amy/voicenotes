export default {
  apps: [
    {
      name: "audio-transcriber",
      script: "./out/main.js",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "512M",
      kill_timeout: 30000,
      wait_ready: true,
      listen_timeout: 10000,
      exp_backoff_restart_delay: 100,
      error_file: "/dev/stdout",
      out_file: "/dev/stdout",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
