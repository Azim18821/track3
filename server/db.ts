import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
// Import environment first to load variables
import './env';

// Set WebSocket constructor for Neon
neonConfig.webSocketConstructor = ws;

// Check for database URL
if (!process.env.DATABASE_URL) {
  console.error("⚠️ DATABASE_URL environment variable is missing");
  
  // When running in development, show helpful message about environment setup
  if (process.env.NODE_ENV === 'development') {
    console.error(`
    ----------------------------------------
    DATABASE CONNECTION ERROR
    ----------------------------------------
    You need to set the DATABASE_URL environment variable when running locally.
    
    Options:
    1. Run with the database URL directly:
       DATABASE_URL=postgres://user:pass@host:port/db npm run dev
       
    2. Create a .env file in the project root with your database details:
       DATABASE_URL=postgres://user:pass@host:port/db
       
    3. For iOS testing, use:
       ./scripts/build-ios-local.sh --ip YOUR_MACHINE_IP --port 3000
    ----------------------------------------
    `);
  }
  
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Show database connection info in development mode
if (process.env.NODE_ENV === 'development') {
  // Mask sensitive parts of the connection string when logging
  const maskedUrl = process.env.DATABASE_URL.replace(
    /(postgres:\/\/)([^:]+):([^@]+)@/,
    '$1$2:****@'
  );
  console.log(`🔌 Connecting to database: ${maskedUrl}`);
}

// Create a connection pool to the database
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// Create a Drizzle ORM instance with the pool and schema
export const db = drizzle(pool, { schema });

// Log that database connection is established
console.log('✅ Database connection initialized');