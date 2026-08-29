export interface Song extends Record<string, unknown> {
    id: string;
    title: string;
    artist: string;
    defaultKey: string;
    bpm: number | null;
    notes: string;
    referenceUrl: string;
    createdAt: string;
    updatedAt: string;
}

export type AnnouncementPriority = 'low' | 'medium' | 'high';

export const ANNOUNCEMENT_WEEKDAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
] as const;

export type AnnouncementWeekday = typeof ANNOUNCEMENT_WEEKDAYS[number];

export interface AnnouncementOccurrence {
    id: string;
    date: string;
    recurringDay: AnnouncementWeekday | '';
    time: string;
    note: string;
}

export interface Announcement extends Record<string, unknown> {
    id: string;
    title: string;
    body: string;
    speaker: string;
    startDate: string;
    endDate: string;
    occurrences: AnnouncementOccurrence[];
    remarks: string;
    priority: AnnouncementPriority;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export type LibraryKind = 'songs' | 'announcements';

export interface SongInput {
    title: string;
    artist?: string;
    defaultKey?: string;
    bpm?: number | null;
    notes?: string;
    referenceUrl?: string;
}

export interface AnnouncementInput {
    title: string;
    body?: string;
    speaker?: string;
    startDate?: string;
    endDate?: string;
    occurrences?: AnnouncementOccurrence[];
    remarks?: string;
    priority?: AnnouncementPriority;
    isActive?: boolean;
}
