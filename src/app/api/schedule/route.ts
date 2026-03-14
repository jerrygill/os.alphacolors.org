import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { OverrideData, CustomAct } from '@/lib/storage';

// Initialize Redis. It will automatically use UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
// If these are not present, it will throw an error when used, so we create it lazily or check for env vars.
const getRedis = () => {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return null;
    }
    return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
};

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

    const redis = getRedis();
    if (!redis) {
        // If Redis isn't configured yet, gracefully return empty data so the app doesn't crash during setup
        return NextResponse.json(DEFAULT_DATA);
    }

    try {
        const key = `os-week-${weekKey}`;
        const data = await redis.get<WeekData>(key);
        
        return NextResponse.json(data || DEFAULT_DATA);
    } catch (error) {
        console.error('Error fetching from Redis:', error);
        return NextResponse.json(DEFAULT_DATA); // Fallback to empty on error
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
        console.warn('Cannot save: Upstash Redis is not configured.');
        return NextResponse.json({ success: false, message: 'Redis not configured' }, { status: 500 });
    }

    try {
        const body = await req.json() as Partial<WeekData>;
        const key = `os-week-${weekKey}`;
        
        // Fetch existing first to merge
        const existing = await redis.get<WeekData>(key) || DEFAULT_DATA;
        
        const merged: WeekData = {
            overrides: body.overrides ?? existing.overrides,
            customActs: body.customActs ?? existing.customActs,
            rowOrder: body.rowOrder !== undefined ? body.rowOrder : existing.rowOrder,
        };

        // Save to Redis
        await redis.set(key, merged);

        return NextResponse.json({ success: true, data: merged });
    } catch (error) {
        console.error('Error saving to Redis:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
