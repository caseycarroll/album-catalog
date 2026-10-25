import * as v from "valibot";
import { inArray } from "drizzle-orm";
import { albumsTable } from "../../db/schema";
import { db } from "../../db";

const USER_AGENT = "Casey's Catalog/1.0 (aiyakc@gmail.com)";

const ReleaseGroupSearchSchema = v.object({
  "release-groups": v.array(
    v.object({
      id: v.string(),
      title: v.string(),
      "first-release-date": v.optional(v.string()),
      "artist-credit": v.optional(
        v.array(v.object({ name: v.string(), joinphrase: v.optional(v.string()) })),
        [],
      ),
    }),
  ),
});

// Lucene special characters must be escaped, otherwise a user typing a quote
// or colon breaks (or changes the meaning of) the query.
function escapeLucene(value: string) {
  return value.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, "\\$&");
}

export async function searchAlbums(name: string): Promise<typeof albumsTable.$inferSelect[]> {
  const url = new URL("https://musicbrainz.org/ws/2/release-group");
  url.search = new URLSearchParams({
    query: `releasegroup:"${escapeLucene(name)}" AND primarytype:album`,
    fmt: "json",
    limit: "5",
  }).toString();

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`MusicBrainz responded ${res.status}`);

  const data = v.parse(ReleaseGroupSearchSchema, await res.json());

  return data["release-groups"].map((rg) => ({
    id: rg.id,
    title: rg.title,
    artist: rg["artist-credit"].map((c) => c.name + (c.joinphrase ?? "")).join(""),
    image: `https://coverartarchive.org/release-group/${rg.id}/front-250`
  }));
}


// Search MusicBrainz, then mark which results are already in the catalog so
// each result can render as owned or not.
async function searchWithCatalogState(query: string) {
  const albums = await searchAlbums(query);
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
