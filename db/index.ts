import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

mkdirSync('/mnt/data', { recursive: true });
const sqlite = new Database('/mnt/data/sqlite');
export const db = drizzle(sqlite, { schema });

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, '../drizzle');
mkdirSync(migrationsFolder, { recursive: true });
migrate(db, { migrationsFolder });