import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { OverrideData, CustomAct } from '@/lib/storage';

export interface WeekData {
    overrides: OverrideData;
    customActs: CustomAct[];
    rowOrder: string[] | null;
}

const DEFAULT_DATA: WeekData = {
    overrides: {},
    customActs: [],
    rowOrder: null,
};

// Resolve the connection string from any possible env var name
function getConnectionString(): string | undefined {
    return (
        process.env.POSTGRES_URL ||
        process.env.DATABASE_URL ||
        process.env.STORAGE_URL ||
        process.env.NEON_DATABASE_URL ||
        process.env.POSTGRES_URL_NON_POOLING ||
        process.env.POSTGRES_URL_NO_SSL ||
        process.env.DATABASE_URL_UNPOOLED ||
        // Fallback: assemble from individual PG* vars
        (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE
            ? `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=require`
            : undefined)
    );
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const weekKey = searchParams.get('weekKey');

    if (!weekKey) {
        return NextResponse.json({ error: 'weekKey is required' }, { status: 400 });
    }

    const connStr = getConnectionString();
    if (!connStr) {
        return NextResponse.json(DEFAULT_DATA, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }

    try {
        const sql = neon(connStr);
        const rows = await sql`
            SELECT data FROM os_schedule_data 
            WHERE week_key = ${weekKey} 
            LIMIT 1;
        `;

        const data = rows.length > 0 ? (rows[0].data as WeekData) : DEFAULT_DATA;

        return NextResponse.json(data, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (error: any) {
        if (error.message && error.message.includes('does not exist')) {
            return NextResponse.json(DEFAULT_DATA, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
        }
        console.error('Neon GET error:', error);
        return NextResponse.json(DEFAULT_DATA, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const weekKey = searchParams.get('weekKey');

    if (!weekKey) {
        return NextResponse.json({ error: 'weekKey is required' }, { status: 400 });
    }

    const connStr = getConnectionString();
    if (!connStr) {
        const debugVars = {
            POSTGRES_URL: !!process.env.POSTGRES_URL,
            DATABASE_URL: !!process.env.DATABASE_URL,
            STORAGE_URL: !!process.env.STORAGE_URL,
            PGHOST: !!process.env.PGHOST,
        };
        console.error('POST: No connection string found:', JSON.stringify(debugVars));
        return NextResponse.json({ error: 'Database not configured', debug: debugVars }, { status: 503 });
    }

    try {
        const sql = neon(connStr);

        // 1. Ensure table exists
        await sql`
            CREATE TABLE IF NOT EXISTS os_schedule_data (
                week_key VARCHAR(50) PRIMARY KEY,
                data JSONB NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const body = await req.json() as Partial<WeekData>;

        // 2. Fetch existing
        const rows = await sql`SELECT data FROM os_schedule_data WHERE week_key = ${weekKey} LIMIT 1;`;
        const existing: WeekData = rows.length > 0 ? (rows[0].data as WeekData) : DEFAULT_DATA;

        // 3. Merge
        const merged: WeekData = {
            overrides: body.overrides ?? existing.overrides,
            customActs: body.customActs ?? existing.customActs,
            rowOrder: body.rowOrder !== undefined ? body.rowOrder : existing.rowOrder,
        };

        // 4. Upsert
        await sql`
            INSERT INTO os_schedule_data (week_key, data, updated_at)
            VALUES (${weekKey}, ${JSON.stringify(merged)}, CURRENT_TIMESTAMP)
            ON CONFLICT (week_key) 
            DO UPDATE SET 
                data = EXCLUDED.data,
                updated_at = EXCLUDED.updated_at;
        `;

        return NextResponse.json({ success: true, data: merged });
    } catch (error) {
        console.error('Neon POST error:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
