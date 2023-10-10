import * as dotenv from "dotenv";
import type { Config } from "drizzle-kit";

// get .env variables
dotenv.config();

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL as string,
  }
} satisfies Config;
