import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePooled } from 'drizzle-orm/neon-serverless';
import { neon, Pool } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = neon(env.DATABASE_URL);
const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzleHttp(client, { schema });
export const transactionDb = drizzlePooled(pool, { schema });
