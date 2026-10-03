const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/database');

async function startServer() {
  console.log('Connecting to PostgreSQL database...');
  const connected = await testConnection();
  if (!connected) {
    console.error('Fatal: Cannot start server without active database connection.');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`Student Organization System Backend running on port ${env.PORT}`);
    console.log(`Health check: http://localhost:${env.PORT}/health`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
