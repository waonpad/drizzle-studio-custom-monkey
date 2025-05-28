import { relations } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";
import { tableCreator, withTimestamp } from "./_table";
import { postsTable } from "./posts";

export const usersTable = tableCreator("users", {
  ...withTimestamp,
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
});

export const usersTableRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable, { relationName: "post__author" }),
}));

export type UserModel = typeof usersTable.$inferSelect;

export type InsertUserModel = typeof usersTable.$inferInsert;
