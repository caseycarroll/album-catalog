import * as v from "valibot";
import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cachedSearch } from "../../lib/cachedSearch";
import { albumsTable } from "../../db/schema";

// Search MusicBrainz, then mark which results are already in the catalog so
// each result can render as owned or not.
async function searchWithCatalogState(query: string) {
  const albums = await cachedSearch(query);
  if (!albums.length) return [];

  const saved = await db
    .select({ id: albumsTable.id })
    .from(albumsTable)
    .where(inArray(albumsTable.id, albums.map((album) => album.id)));
  const savedIds = new Set(saved.map((row) => row.id));

  return albums.map((album) => ({ album, owned: savedIds.has(album.id) }));
}

export const GET = Run.GET(
  { search: v.object({ q: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))) }) },
  (ctx, next) => {
    const [search, issues] = ctx.search;
    const query = issues ? "" : (search.q ?? "");
    const results = query ? searchWithCatalogState(query) : Promise.resolve([]);
    return next({ query, results });
  },
);
