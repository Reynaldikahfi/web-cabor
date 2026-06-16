import { createClient } from '@libsql/client';

let db;

export default function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL || 'file:tournament.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    db = createClient({
      url,
      authToken,
    });
  }
  return db;
}
