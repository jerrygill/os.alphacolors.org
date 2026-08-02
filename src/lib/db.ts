import 'server-only';

import {neon} from '@neondatabase/serverless';

export function getConnectionString(): string | undefined {
    return (
        process.env.POSTGRES_URL ||
        process.env.DATABASE_URL ||
        process.env.STORAGE_URL ||
        process.env.NEON_DATABASE_URL ||
        process.env.POSTGRES_URL_NON_POOLING ||
        process.env.POSTGRES_URL_NO_SSL ||
        process.env.DATABASE_URL_UNPOOLED ||
        (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE
            ? `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=require`
            : undefined)
    );
}

export function getDatabase() {
    const connectionString = getConnectionString();
    return connectionString ? neon(connectionString) : null;
}
