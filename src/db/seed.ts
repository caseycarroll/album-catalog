import { db } from './index';
import { albumsTable } from './schema';
import { albumImageUrl } from '../lib/albumImageUrl';

// Release-group MBIDs (the "album"), not release MBIDs (a specific pressing).
const albums = [
  { id: 'bc8868e9-dda3-477d-ab89-b62d82cd7ea7', title: 'Pop 2', artist: 'Charli XCX' },
  { id: '3353a8a0-a5ab-4970-b34e-090afcc2bba7', title: 'Human Performance', artist: 'Parquet Courts' },
  { id: '8b53c7f1-d1b0-48ef-8b36-08cec0b84b6d', title: 'Intersections', artist: 'Into It. Over It.' },
].map((album) => ({ ...album, image: albumImageUrl(album.id) }));

await db.delete(albumsTable);
await db.insert(albumsTable).values(albums);
