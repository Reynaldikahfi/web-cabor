import { createClient } from '@libsql/client';
import path from 'path';

let db;

export default function getDb() {
  if (!db) {
    let url = process.env.TURSO_DATABASE_URL;
    if (!url || url === '') {
      url = `file:${path.join(process.cwd(), 'tournament.db').replace(/\\/g, '/')}`;
    }
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    db = createClient({
      url,
      authToken,
    });
  }
  return db;
}
