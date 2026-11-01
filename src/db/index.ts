import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql/web";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
}

export const db = drizzle({
  connection: { url, authToken },
});
