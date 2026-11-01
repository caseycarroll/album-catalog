import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';

const tursoUrl = process.env.TURSO_DATABASE_URL;

const db = tursoUrl
  ? drizzle({
      connection: {
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      },
    })
  : drizzle(process.env.DB_FILE_NAME!);
export { db };
