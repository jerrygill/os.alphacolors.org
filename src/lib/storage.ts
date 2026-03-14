import { ScheduleItem } from './types';

export interface OverrideData {
    [cellId: string]: string;
}

export interface CustomAct extends ScheduleItem {
    isNew: true;
    insertAfterId?: string;
}

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

// Fetch all data for a week
export async function getWeekData(weekKey: string): Promise<WeekData> {
    if (typeof window === 'undefined') return DEFAULT_DATA;
    try {
        const res = await fetch(`/api/schedule?weekKey=${weekKey}`, {
            next: { revalidate: 0 } // Always get fresh data on client
        });
        if (!res.ok) return DEFAULT_DATA;
        return await res.json();
    } catch (e) {
        console.error('Failed to fetch cloud data', e);
        return DEFAULT_DATA;
    }
}

// Push an exact payload to the cloud
export async function saveWeekData(weekKey: string, data: Partial<WeekData>): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        await fetch(`/api/schedule?weekKey=${weekKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error('Failed to save to cloud', e);
    }
}

// Clear all data for a week (Reset)
export async function clearWeekData(weekKey: string): Promise<void> {
    await saveWeekData(weekKey, { overrides: {}, customActs: [], rowOrder: null });
}
