import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/core/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './artifacts/development/cardo.sqlite',
  },
  strict: true,
  verbose: true,
});
