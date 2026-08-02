import {ScheduleItem} from './types';

export interface OverrideMap {
    [key: string]: string | undefined;
}

export type OverrideData = OverrideMap;

export interface CustomAct extends ScheduleItem {
    isNew: true;
    insertAfterId?: string;
}

export interface PublishedScheduleSnapshot {
    overrides: OverrideData;
    customActs: CustomAct[];
    rowOrder: string[] | null;
    songIds: string[];
    announcementIds: string[];
}

export interface WeekData extends PublishedScheduleSnapshot {
    status: 'draft' | 'published';
    publishedAt: string | null;
    publishedSnapshot: PublishedScheduleSnapshot | null;
}

export const DEFAULT_WEEK_DATA: WeekData = {
    overrides: {},
    customActs: [],
    rowOrder: null,
    songIds: [],
    announcementIds: [],
    status: 'draft',
    publishedAt: null,
    publishedSnapshot: null,
};

export function normalizeWeekData(value: Partial<WeekData> | null | undefined): WeekData {
    return {
        overrides: value?.overrides || {},
        customActs: value?.customActs || [],
        rowOrder: value?.rowOrder ?? null,
        songIds: value?.songIds || [],
        announcementIds: value?.announcementIds || [],
        status: value?.status === 'published' ? 'published' : 'draft',
        publishedAt: value?.publishedAt || null,
        publishedSnapshot: value?.publishedSnapshot || null,
    };
}

export function getPublicWeekData(value: WeekData): WeekData {
    if (!value.publishedSnapshot) return normalizeWeekData(DEFAULT_WEEK_DATA);
    return {
        ...value,
        ...value.publishedSnapshot,
        status: 'published',
    };
}

export async function getWeekData(weekKey: string, admin = false): Promise<WeekData> {
    if (typeof window === 'undefined') return DEFAULT_WEEK_DATA;
    const mode = admin ? '&mode=admin' : '';
    const response = await fetch(`/api/schedule?weekKey=${encodeURIComponent(weekKey)}${mode}`, {
        cache: 'no-store',
    });
    if (!response.ok) throw new Error('Unable to load service data.');
    return normalizeWeekData(await response.json());
}

export async function saveWeekData(weekKey: string, data: Partial<WeekData>): Promise<WeekData> {
    const response = await fetch(`/api/schedule?weekKey=${encodeURIComponent(weekKey)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({data}),
    });
    const result = await response.json().catch(() => ({})) as {error?: string; data?: WeekData};
    if (!response.ok || !result.data) throw new Error(result.error || 'Unable to save service data.');
    return normalizeWeekData(result.data);
}

export async function publishWeekData(weekKey: string): Promise<WeekData> {
    const response = await fetch(`/api/schedule?weekKey=${encodeURIComponent(weekKey)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'publish'}),
    });
    const result = await response.json().catch(() => ({})) as {error?: string; data?: WeekData};
    if (!response.ok || !result.data) throw new Error(result.error || 'Unable to publish service.');
    return normalizeWeekData(result.data);
}

export async function clearWeekData(weekKey: string): Promise<WeekData> {
    const response = await fetch(`/api/schedule?weekKey=${encodeURIComponent(weekKey)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'reset'}),
    });
    const result = await response.json().catch(() => ({})) as {error?: string; data?: WeekData};
    if (!response.ok || !result.data) throw new Error(result.error || 'Unable to reset service data.');
    return normalizeWeekData(result.data);
}
