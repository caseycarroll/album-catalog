import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { albumsTable } from './schema';

const db = drizzle(process.env.DB_FILE_NAME!);

async function main() {
  const user: typeof albumsTable.$inferInsert = {
    title: 'Pop 2',
    artist: 'Charli XCX',
    image: 'https://i.scdn.co/image/ab67616d00001e02da30209ea35caf1d46931818'
  };

  await db.insert(albumsTable).values(user);
}

main();
