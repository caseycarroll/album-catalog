import * as v from "valibot";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { albumsTable } from "../../../db/schema";
import { searchByBarcode } from "../../../lib/searchByBarcode";

export const GET = Run.GET(
  {
    search: v.object({ barcode: v.pipe(v.string(), v.regex(/^\d{8,14}$/)) }),
  },
  async (ctx) => {
    const [search, issues] = ctx.search;
    if (issues) return Response.json({ error: "Invalid barcode." }, { status: 400 });

    try {
      const album = await searchByBarcode(search.barcode);
      if (!album) return Response.json({ album: null, owned: false });

      const saved = await db
        .select({ id: albumsTable.id })
        .from(albumsTable)
        .where(eq(albumsTable.id, album.id))
        .limit(1);

      return Response.json({ album, owned: saved.length > 0 });
    } catch (error) {
      console.error("Barcode lookup failed", error);
      return Response.json({ error: "Could not look up that barcode." }, { status: 502 });
    }
  },
);
