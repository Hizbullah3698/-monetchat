module.exports = {
  apps: [
    {
      name: "redis",
      script: "redis-server",
      args: "--port 6379"
    },
    {
      name: "qdrant",
      script: "./qdrant",
      cwd: "/opt/qdrant"
    },
    {
      name: "monetchat-web",
      script: "node",
      args: ".next/standalone/server.js",
      cwd: "/workspace/monetchat",
      env: {
        PORT: 3000,
        HOST: "0.0.0.0"
      }
    }
  ]
}
