import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
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

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const weekKey = searchParams.get('weekKey');

    if (!weekKey) {
        return NextResponse.json({ error: 'weekKey is required' }, { status: 400 });
    }

    try {
        // Fetch the JSON payload for this specific week from Postgres
        const { rows } = await sql`
            SELECT data FROM os_schedule_data 
            WHERE week_key = ${weekKey} 
            LIMIT 1;
        `;

        const data = rows.length > 0 ? (rows[0].data as WeekData) : DEFAULT_DATA;

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            }
        });
    } catch (error: any) {
        // If the table doesn't exist yet, it will throw an error. We want to just return default data gracefully.
        if (error.message && error.message.includes('does not exist')) {
            return NextResponse.json(DEFAULT_DATA, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
        }
        console.error('Postgres GET error:', error);
        return NextResponse.json(DEFAULT_DATA, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const weekKey = searchParams.get('weekKey');

    if (!weekKey) {
        return NextResponse.json({ error: 'weekKey is required' }, { status: 400 });
    }

    try {
        // 1. Ensure the table exists on every POST (runs very fast if it already does)
        await sql`
            CREATE TABLE IF NOT EXISTS os_schedule_data (
                week_key VARCHAR(50) PRIMARY KEY,
                data JSONB NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const body = await req.json() as Partial<WeekData>;
        
        // 2. Fetch existing data first to merge 
        const { rows } = await sql`SELECT data FROM os_schedule_data WHERE week_key = ${weekKey} LIMIT 1;`;
        const existing: WeekData = rows.length > 0 ? (rows[0].data as WeekData) : DEFAULT_DATA;

        // 3. Merge data cleanly
        const merged: WeekData = {
            overrides: body.overrides ?? existing.overrides,
            customActs: body.customActs ?? existing.customActs,
            rowOrder: body.rowOrder !== undefined ? body.rowOrder : existing.rowOrder,
        };

        // 4. Upsert (Insert or Update) into Postgres
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
        console.error('Postgres POST error:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
