import * as v from "valibot";
import type { albumsTable } from "../db/schema";

const USER_AGENT = "Casey's Catalog/1.0 (aiyakc@gmail.com)";
const CACHE_SIZE = 100;

const ArtistCreditSchema = v.object({
  name: v.optional(v.string()),
  joinphrase: v.optional(v.string(), ""),
  artist: v.optional(v.object({ name: v.string() })),
});

const ReleaseGroupSchema = v.object({
  id: v.string(),
  title: v.optional(v.string()),
});

const ReleaseSearchSchema = v.object({
  releases: v.array(
    v.object({
      id: v.string(),
      title: v.string(),
      "artist-credit": v.optional(v.array(ArtistCreditSchema), []),
      "release-group": v.optional(ReleaseGroupSchema),
    }),
  ),
});

const ReleaseLookupSchema = v.object({
  "release-group": v.optional(ReleaseGroupSchema),
});

type Album = typeof albumsTable.$inferSelect;

let requestQueue = Promise.resolve();
let nextRequestAt = 0;

// MusicBrainz asks clients to keep requests to roughly one per second.
function requestMusicBrainz(url: URL) {
  const request = requestQueue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + 1100;

    return fetch(url, { headers: { "User-Agent": USER_AGENT } });
  });

  requestQueue = request.then(() => undefined, () => undefined);
  return request;
}

async function lookupReleaseGroup(releaseId: string) {
  const url = new URL(`https://musicbrainz.org/ws/2/release/${releaseId}`);
  url.search = new URLSearchParams({ inc: "release-groups", fmt: "json" }).toString();

  const response = await requestMusicBrainz(url);
  if (!response.ok) throw new Error(`MusicBrainz responded ${response.status}`);

  const data = v.parse(ReleaseLookupSchema, await response.json());
  return data["release-group"];
}

async function findAlbumByBarcode(barcode: string): Promise<Album | null> {
  const url = new URL("https://musicbrainz.org/ws/2/release");
  url.search = new URLSearchParams({
    query: `barcode:${barcode}`,
    fmt: "json",
    limit: "10",
  }).toString();

  const response = await requestMusicBrainz(url);
  if (!response.ok) throw new Error(`MusicBrainz responded ${response.status}`);

  const data = v.parse(ReleaseSearchSchema, await response.json());
  const release = data.releases[0];
  if (!release) return null;

  const releaseGroup = release["release-group"] ?? (await lookupReleaseGroup(release.id));
  if (!releaseGroup) return null;

  return {
    id: releaseGroup.id,
    title: releaseGroup.title ?? release.title,
    artist: release["artist-credit"]
      .map((credit) => `${credit.name ?? credit.artist?.name ?? ""}${credit.joinphrase}`)
      .join(""),
    image: `https://coverartarchive.org/release-group/${releaseGroup.id}/front-250`,
  };
}

const cache = new Map<string, Promise<Album | null>>();

export function searchByBarcode(barcode: string) {
  const cacheHit = cache.get(barcode);
  if (cacheHit) {
    cache.delete(barcode);
    cache.set(barcode, cacheHit);
    return cacheHit;
  }

  if (cache.size >= CACHE_SIZE) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }

  const pending = findAlbumByBarcode(barcode);
  cache.set(barcode, pending);
  pending.catch(() => {
    if (cache.get(barcode) === pending) cache.delete(barcode);
  });

  return pending;
}
