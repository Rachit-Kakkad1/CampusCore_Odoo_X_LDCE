const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env or backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const env = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'student_org',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  JWT_SECRET: process.env.JWT_SECRET || 'student_org_jwt_secret_ldce_2026',
  QR_SECRET: process.env.QR_SECRET || 'student_org_qr_hmac_secret_ldce_2026',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

module.exports = env;
