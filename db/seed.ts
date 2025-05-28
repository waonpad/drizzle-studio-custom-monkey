/**
 * @description
 * ローカルのsqliteにダミーデータを挿入する
 * $ bun seed:dev
 */

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { postFixture, userFixture } from "../src/testing/fixtures";
import * as schema from "./schemas";
import { type PostModel, postsTable } from "./schemas/posts";
import { type UserModel, usersTable } from "./schemas/users";

const sqlite = new Database("./db/db.sqlite");
const db = drizzle(sqlite, { schema });

console.log("Seeding Started...");

const newUsers: UserModel[] = new Array(100).fill(0).map(() => userFixture.build());

await db.insert(usersTable).values(newUsers);

const newPosts: PostModel[] = new Array(1000)
  .fill(0)
  .map(() =>
    postFixture.build({
      authorId: newUsers[Math.floor(Math.random() * newUsers.length)].id,
    }),
  )
  .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

await db.insert(postsTable).values(newPosts);

console.log("Seeding Completed!");
