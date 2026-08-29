import type {PublishedScheduleSnapshot, WeekData} from './storage';

export function editableWeekData(data: WeekData): PublishedScheduleSnapshot {
    return {
        overrides: {...data.overrides},
        customActs: data.customActs.map((item) => ({...item})),
        rowOrder: data.rowOrder ? [...data.rowOrder] : null,
        songIds: [...data.songIds],
        announcementIds: [...data.announcementIds],
    };
}

export function areWeekDraftsEqual(
    left: PublishedScheduleSnapshot,
    right: PublishedScheduleSnapshot,
): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

export function moveId(ids: string[], activeId: string, overId: string): string[] {
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0 || from === to) return ids;

    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}

export function moveIdByOffset(ids: string[], id: string, offset: -1 | 1): string[] {
    const from = ids.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= ids.length) return ids;

    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
}
