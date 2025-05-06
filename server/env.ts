// Load environment variables from .env file in development
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Determine the environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Try to load environment files in order of preference
const envFiles = [
  `.env.${NODE_ENV}.local`, // .env.development.local
  `.env.${NODE_ENV}`,       // .env.development
  '.env.local',             // .env.local
  '.env',                   // .env
];

// Find first existing env file and load it
let envLoaded = false;
for (const file of envFiles) {
  const filePath = resolve(process.cwd(), file);
  if (existsSync(filePath)) {
    config({ path: filePath });
    console.log(`Environment loaded from ${file}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('No environment file found, using system environment variables');
}

// Verify required variables
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
}

export default {
  isDevelopment: NODE_ENV === 'development',
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  databaseUrl: process.env.DATABASE_URL,
};