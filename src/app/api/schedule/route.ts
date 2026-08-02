import {NextRequest, NextResponse} from 'next/server';
import {hasAdminSession} from '@/lib/admin-auth';
import {getDatabase} from '@/lib/db';
import {
    DEFAULT_WEEK_DATA,
    getPublicWeekData,
    normalizeWeekData,
    PublishedScheduleSnapshot,
    WeekData,
} from '@/lib/storage';

async function ensureScheduleTable(sql: NonNullable<ReturnType<typeof getDatabase>>) {
    await sql`
        CREATE TABLE IF NOT EXISTS os_schedule_data (
            week_key VARCHAR(50) PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
}

function snapshot(data: WeekData): PublishedScheduleSnapshot {
    return {
        overrides: data.overrides,
        customActs: data.customActs,
        rowOrder: data.rowOrder,
        songIds: data.songIds,
        announcementIds: data.announcementIds,
    };
}

export async function GET(request: NextRequest) {
    const weekKey = request.nextUrl.searchParams.get('weekKey');
    const isAdminMode = request.nextUrl.searchParams.get('mode') === 'admin';

    if (!weekKey) return NextResponse.json({error: 'weekKey is required'}, {status: 400});
    if (isAdminMode && !(await hasAdminSession())) {
        return NextResponse.json({error: 'Admin access required.'}, {status: 401});
    }

    const sql = getDatabase();
    if (!sql) return NextResponse.json(DEFAULT_WEEK_DATA);

    try {
        await ensureScheduleTable(sql);
        const rows = await sql`
            SELECT data FROM os_schedule_data
            WHERE week_key = ${weekKey}
            LIMIT 1;
        `;
        const data = normalizeWeekData(rows.length ? rows[0].data as Partial<WeekData> : null);
        return NextResponse.json(isAdminMode ? data : getPublicWeekData(data), {
            headers: {'Cache-Control': 'no-store, max-age=0'},
        });
    } catch (error) {
        console.error('Schedule GET error:', error);
        return NextResponse.json({error: 'Unable to load service data.'}, {status: 500});
    }
}

export async function POST(request: NextRequest) {
    const weekKey = request.nextUrl.searchParams.get('weekKey');
    if (!weekKey) return NextResponse.json({error: 'weekKey is required'}, {status: 400});
    if (!(await hasAdminSession())) {
        return NextResponse.json({error: 'Admin access required.'}, {status: 401});
    }

    const sql = getDatabase();
    if (!sql) return NextResponse.json({error: 'Database not configured.'}, {status: 503});

    const body = await request.json().catch(() => null) as {
        action?: 'publish' | 'reset';
        data?: Partial<WeekData>;
    } | null;
    if (!body) return NextResponse.json({error: 'Invalid request body.'}, {status: 400});

    try {
        await ensureScheduleTable(sql);
        const rows = await sql`SELECT data FROM os_schedule_data WHERE week_key = ${weekKey} LIMIT 1;`;
        const existing = normalizeWeekData(rows.length ? rows[0].data as Partial<WeekData> : null);

        let merged: WeekData;
        if (body.action === 'reset') {
            merged = normalizeWeekData(DEFAULT_WEEK_DATA);
        } else {
            const patch = body.data || {};
            merged = normalizeWeekData({...existing, ...patch});
            if (body.action === 'publish') {
                merged = {
                    ...merged,
                    status: 'published',
                    publishedAt: new Date().toISOString(),
                    publishedSnapshot: snapshot(merged),
                };
            } else if (existing.publishedSnapshot) {
                merged.status = 'draft';
            }
        }

        await sql`
            INSERT INTO os_schedule_data (week_key, data, updated_at)
            VALUES (${weekKey}, ${JSON.stringify(merged)}, CURRENT_TIMESTAMP)
            ON CONFLICT (week_key)
            DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
        `;

        return NextResponse.json({data: merged});
    } catch (error) {
        console.error('Schedule POST error:', error);
        return NextResponse.json({error: 'Unable to save service data.'}, {status: 500});
    }
}
