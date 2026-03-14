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

// Initialize Redis only if we have the URL
let redis: Redis | null = null;
if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const weekKey = searchParams.get('weekKey');

    if (!weekKey) {
        return NextResponse.json({ error: 'weekKey is required' }, { status: 400 });
    }

    if (!redis) {
        // If Redis isn't configured yet, gracefully return empty data
        return NextResponse.json(DEFAULT_DATA);
    }

    try {
        const key = `os-week-${weekKey}`;
        const raw = await redis.get(key);
        const data = raw ? JSON.parse(raw) as WeekData : DEFAULT_DATA;
        
        return NextResponse.json(data);
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

    if (!redis) {
        console.warn('Cannot save: REDIS_URL is not configured.');
        return NextResponse.json({ success: false, message: 'Redis not configured' }, { status: 500 });
    }

    try {
        const body = await req.json() as Partial<WeekData>;
        const key = `os-week-${weekKey}`;
        
        // Fetch existing first to merge
        const raw = await redis.get(key);
        const existing = raw ? JSON.parse(raw) as WeekData : DEFAULT_DATA;
        
        const merged: WeekData = {
            overrides: body.overrides ?? existing.overrides,
            customActs: body.customActs ?? existing.customActs,
            rowOrder: body.rowOrder !== undefined ? body.rowOrder : existing.rowOrder,
        };

        // Save to Redis (as a string)
        await redis.set(key, JSON.stringify(merged));

        return NextResponse.json({ success: true, data: merged });
    } catch (error) {
        console.error('Error saving to Redis:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
