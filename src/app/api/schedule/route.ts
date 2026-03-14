import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
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

// Use a lazy singleton to avoid module-level initialization issues with Next.js runtime
let _redis: Redis | null = null;
function getRedis(): Redis | null {
    if (!process.env.REDIS_URL) return null;
    if (!_redis) {
        _redis = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            connectTimeout: 5000,
            lazyConnect: false,
        });
        _redis.on('error', (err) => {
            console.error('Redis connection error:', err);
        });
    }
    return _redis;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const weekKey = searchParams.get('weekKey');

    if (!weekKey) {
        return NextResponse.json({ error: 'weekKey is required' }, { status: 400 });
    }

    const redis = getRedis();
    if (!redis) {
        console.warn('GET /api/schedule: REDIS_URL not configured, returning default data.');
        return NextResponse.json(DEFAULT_DATA);
    }

    try {
        const key = `os-week-${weekKey}`;
        const raw = await redis.get(key);
        const data = raw ? JSON.parse(raw) as WeekData : DEFAULT_DATA;

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            }
        });
    } catch (error) {
        console.error('Redis GET error:', error);
        return NextResponse.json(DEFAULT_DATA);
    }
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const weekKey = searchParams.get('weekKey');

    if (!weekKey) {
        return NextResponse.json({ error: 'weekKey is required' }, { status: 400 });
    }

    const redis = getRedis();
    if (!redis) {
        console.warn('POST /api/schedule: REDIS_URL not configured, cannot save.');
        return NextResponse.json({ success: false, message: 'Redis not configured' }, { status: 503 });
    }

    try {
        const body = await req.json() as Partial<WeekData>;
        const key = `os-week-${weekKey}`;

        // Fetch existing data first to merge (so individual saves don't overwrite each other)
        const raw = await redis.get(key);
        const existing: WeekData = raw ? JSON.parse(raw) : DEFAULT_DATA;

        const merged: WeekData = {
            overrides: body.overrides ?? existing.overrides,
            customActs: body.customActs ?? existing.customActs,
            rowOrder: body.rowOrder !== undefined ? body.rowOrder : existing.rowOrder,
        };

        await redis.set(key, JSON.stringify(merged));

        return NextResponse.json({ success: true, data: merged });
    } catch (error) {
        console.error('Redis POST error:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
