import * as v from "valibot";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-orm/valibot";
import { albumsTable } from "../../db/schema";
import { db } from "../../db";

// The <album> form posts every field plus `owned`. A checked checkbox submits
// "on"; an unchecked one is omitted entirely, so absence means "not owned".
const albumFormSchema = v.object({
  ...createInsertSchema(albumsTable).entries,
  owned: v.optional(v.literal("on")),
});

export const POST = Run.POST({ form: albumFormSchema }, async (ctx) => {
  const [form, issues] = await ctx.body;
  if (issues) return new Response("Invalid album", { status: 400 });

  const { owned, ...album } = form;
  if (owned) {
    await db.insert(albumsTable).values(album).onConflictDoNothing();
  } else {
    await db.delete(albumsTable).where(eq(albumsTable.id, album.id));
  }

  // Enhanced (fetch) submissions stay on the page; the checkbox already shows
  // the new state. Plain form submissions get POST-redirect-GET.
  if (ctx.request.headers.get("accept")?.includes("application/json")) {
    return new Response(null, { status: 204 });
  }
  return ctx.back("/");
});
