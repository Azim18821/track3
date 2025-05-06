import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Set WebSocket constructor for Neon
neonConfig.webSocketConstructor = ws;

// Ensure that DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool to the database
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// Create a Drizzle ORM instance with the pool and schema
export const db = drizzle(pool, { schema });

// Log that database connection is established
console.log('Database connection initialized');