import * as v from "valibot";

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

export type AlbumCandidate = {
  mbid: string;
  title: string;
  artist: string;
  year: string | undefined;
};

// Lucene special characters must be escaped, otherwise a user typing a quote
// or colon breaks (or changes the meaning of) the query.
function escapeLucene(value: string) {
  return value.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, "\\$&");
}

export async function searchAlbums(name: string): Promise<AlbumCandidate[]> {
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
    mbid: rg.id,
    title: rg.title,
    artist: rg["artist-credit"].map((c) => c.name + (c.joinphrase ?? "")).join(""),
    year: rg["first-release-date"]?.slice(0, 4) || undefined,
  }));
}


export const GET = Run.GET(
  { search: v.object({ q: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))) }) },
  (ctx, next) => {
    const [search, issues] = ctx.search;
    const query = issues ? "" : (search.q ?? "");
    const results = query ? searchAlbums(query) : Promise.resolve([]);
    return next({ query, results });
  },
);
