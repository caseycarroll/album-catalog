import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const albumsTable = sqliteTable("albums_table", {
  id: text().primaryKey(),
  title: text().notNull(),
  artist: text().notNull(),
  image: text(),
});
