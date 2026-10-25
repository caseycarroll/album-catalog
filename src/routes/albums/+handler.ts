import * as v from "valibot";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-orm/valibot";
import { albumsTable } from "../../db/schema";
import { db } from "../../db";

// The <album> form posts every field plus the clicked button's `intent`.
const albumFormSchema = v.object({
  ...createInsertSchema(albumsTable).entries,
  intent: v.picklist(["add", "remove"]),
});

export const POST = Run.POST({ form: albumFormSchema }, async (ctx) => {
  const [form, issues] = await ctx.body;
  if (issues) return new Response("Invalid album", { status: 400 });

  const { intent, ...album } = form;
  if (intent === "add") {
    await db.insert(albumsTable).values(album).onConflictDoNothing();
  } else {
    await db.delete(albumsTable).where(eq(albumsTable.id, album.id));
  }

  // POST-redirect-GET: reload the page the form was on with refreshed state.
  return ctx.back("/", 303);
});
