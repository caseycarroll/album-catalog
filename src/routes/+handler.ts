import { db } from "../db";
import { albumsTable } from "../db/schema";

export const GET = Run.GET(async (ctx, next) => {
  // Await here so the page renders in one pass. Streaming the album list
  // would stream it after the view transition snapshot is taken.
  const albums = await db.select().from(albumsTable);
  return next({ albums });
});
