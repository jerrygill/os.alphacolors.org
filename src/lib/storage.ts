import { ScheduleItem } from './types';

const safeJsonParse = (val: string | null, fallback: any) => {
    if (!val) return fallback;
    try {
        return JSON.parse(val);
    } catch {
        return fallback;
    }
};

const STORAGE_KEY_PREFIX = 'os-overrides-';

export interface OverrideData {
    [cellId: string]: string; // cellId can be `row-X-col-Y` or specific keys like `host`
}

export interface CustomAct extends ScheduleItem {
    isNew: true;
}

export const getStorageKey = (weekKey: string) => `${STORAGE_KEY_PREFIX}${weekKey}`;

export function saveOverride(weekKey: string, id: string, value: string) {
    if (typeof window === 'undefined') return;

    const key = getStorageKey(weekKey);
    const current = safeJsonParse(localStorage.getItem(key), {});
    current[id] = value;
    localStorage.setItem(key, JSON.stringify(current));
}

export function getOverrides(weekKey: string): OverrideData {
    if (typeof window === 'undefined') return {};
    const key = getStorageKey(weekKey);
    return safeJsonParse(localStorage.getItem(key), {});
}

export function clearOverrides(weekKey: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getStorageKey(weekKey));
}

// Custom Acts Management
const ACTS_KEY_PREFIX = 'os-custom-acts-';

export function addCustomAct(weekKey: string, act: CustomAct) {
    if (typeof window === 'undefined') return;
    const key = `${ACTS_KEY_PREFIX}${weekKey}`;
    const acts = getCustomActs(weekKey);
    acts.push(act);
    localStorage.setItem(key, JSON.stringify(acts));
}

export function getCustomActs(weekKey: string): CustomAct[] {
    if (typeof window === 'undefined') return [];
    const key = `${ACTS_KEY_PREFIX}${weekKey}`;
    return safeJsonParse(localStorage.getItem(key), []);
}

export function removeCustomAct(weekKey: string, actId: string) {
    if (typeof window === 'undefined') return;
    const key = `${ACTS_KEY_PREFIX}${weekKey}`;
    const acts = getCustomActs(weekKey).filter(a => a.id !== actId);
    localStorage.setItem(key, JSON.stringify(acts));
}
