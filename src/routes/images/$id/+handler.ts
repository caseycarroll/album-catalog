export const GET = Run.GET(async (ctx) => {
  const { id } = ctx.params;

  // Only accept MusicBrainz IDs; never use caller-provided URLs in this proxy.
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) {
    return new Response("Invalid album ID", { status: 400 });
  }

  const image = await fetch(
    `https://coverartarchive.org/release-group/${id}/front-250`,
    {
      headers: { "User-Agent": "Casey's Catalog/1.0 (aiyakc@gmail.com)" },
      signal: ctx.signal,
    },
  );

  const headers = new Headers();
  const contentType = image.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  if (image.ok) {
    headers.set("cache-control", "public, max-age=1209600, stale-while-revalidate=604800");
  } else {
    headers.set("cache-control", "no-store");
  }

  return new Response(image.body, { status: image.status, headers });
});
