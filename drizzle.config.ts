import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// This tells Drizzle to load variables from your .env file
dotenv.config({ path: ".env.local" });

export default defineConfig({
      dialect: "turso",
      schema: "./src/db/schema.ts",
      dbCredentials: {
            url: process.env.DATABASE_URL!,
            authToken: process.env.DATABASE_AUTH_TOKEN
      }
});
