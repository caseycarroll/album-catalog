import { db } from "../db";
import { albumsTable } from "../db/schema";

export const GET = Run.GET(async (ctx, next) => {
  // explicitly don't await to pass Promise to <await>
  return next({ albums: db.select().from(albumsTable) });
});
