const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = require('./app');
const { testConnection } = require('./shared/db/pool');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connectivity before opening listener
    const isDbConnected = await testConnection();
    if (isDbConnected) {
      console.log('✅ PostgreSQL connection verified successfully.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error.message);
    process.exit(1);
  }
}

startServer();
