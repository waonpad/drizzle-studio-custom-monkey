import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schemas",
  out: "./db/migrations",
  dbCredentials: {
    url: "./db/db.sqlite",
  },
  dialect: "sqlite",
} satisfies Config;
