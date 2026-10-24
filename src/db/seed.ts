import { db } from './index'
import { albumsTable } from './schema';

await db.delete(albumsTable);
await db.insert(albumsTable).values([
  {
    id: 'a37ef171-cdf1-456a-96be-4a38b74ce225',
    title: 'Pop 2',
    artist: 'Charli XCX',
    image: 'https://archive.org/download/mbid-a37ef171-cdf1-456a-96be-4a38b74ce225/mbid-a37ef171-cdf1-456a-96be-4a38b74ce225-18513150154_thumb500.jpg'
  },
  {
    id: '1fc0d2c5-ecff-4b08-b74d-3428726e313d',
    title: 'Human Performance',
    artist: 'Parquet Courts',
    image: 'https://archive.org/download/mbid-1fc0d2c5-ecff-4b08-b74d-3428726e313d/mbid-1fc0d2c5-ecff-4b08-b74d-3428726e313d-13152570491_thumb500.jpg'
  }
])
