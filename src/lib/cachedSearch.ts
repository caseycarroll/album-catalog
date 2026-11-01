import * as v from "valibot";
import { albumsTable } from "../db/schema";
import { albumImageUrl } from "./albumImageUrl";

const USER_AGENT = "Casey's Catalog/1.0 (aiyakc@gmail.com)";
const LRU_SIZE = 10;

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

async function searchAlbums(normalizedQuery: string): Promise<typeof albumsTable.$inferSelect[]> {
  const url = new URL("https://musicbrainz.org/ws/2/release-group");
  url.search = new URLSearchParams({
    query: `releasegroup:"${normalizedQuery}" AND primarytype:album`,
    fmt: "json",
    limit: "15",
  }).toString();

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`MusicBrainz responded ${res.status}`);

  const data = v.parse(ReleaseGroupSearchSchema, await res.json());

  return data["release-groups"].map((rg) => ({
    id: rg.id,
    title: rg.title,
    artist: rg["artist-credit"].map((c) => c.name + (c.joinphrase ?? "")).join(""),
    image: albumImageUrl(rg.id),
  }));
}

const cache = new Map<string, ReturnType<typeof searchAlbums>>();

// Lucene special characters must be escaped, otherwise a user typing a quote
// or colon breaks (or changes the meaning of) the query.
function escapeLucene(value: string) {
  return value.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, "\\$&");
}

export function cachedSearch(query: string) {
  const normalizedQuery = escapeLucene(query).trim().toLowerCase().replace(/\s+/g, ' ');
  const cacheHit = cache.get(normalizedQuery);
  if (cacheHit) {
    cache.delete(normalizedQuery);
    cache.set(normalizedQuery, cacheHit);
    return cacheHit;
  }

  if (cache.size === LRU_SIZE) {
    const iterator = cache.keys();
    const {value, done} = iterator.next();
    if (!done) {
      cache.delete(value)
    }
  }

  const pending = searchAlbums(normalizedQuery)
  cache.set(normalizedQuery, pending);
  pending.catch(() => {
    if (pending === cache.get(normalizedQuery)) {
      cache.delete(normalizedQuery)
    }
  })
  return pending;
}
