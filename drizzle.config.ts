import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/core/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './artifacts/development/khaosbox.sqlite',
  },
  strict: true,
  verbose: true,
});
