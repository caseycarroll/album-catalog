import * as v from "valibot";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { albumsTable } from "../../db/schema";
import { searchByBarcode } from "../../lib/searchByBarcode";

export type ScanResult =
  | { status: "found"; album: typeof albumsTable.$inferSelect; owned: boolean }
  | { status: "not-found" };

async function lookup(barcode: string): Promise<ScanResult> {
  try {
    const album = await searchByBarcode(barcode);
    if (!album) return { status: "not-found" };

    const saved = await db
      .select({ id: albumsTable.id })
      .from(albumsTable)
      .where(eq(albumsTable.id, album.id))
      .limit(1);

    return { status: "found", album, owned: saved.length > 0 };
  } catch (error) {
    console.error("Barcode lookup failed", error);
    throw error;
  }
}

export const GET = Run.GET(
  {
    search: v.object({
      barcode: v.optional(v.pipe(v.string(), v.regex(/^\d{8,14}$/))),
    }),
  },
  (ctx, next) => {
    const [search, issues] = ctx.search;
    const barcode = issues ? undefined : search.barcode;

    return next({
      barcode,
      scan: barcode ? lookup(barcode) : undefined,
    });
  },
);
