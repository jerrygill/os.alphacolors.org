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

export interface AnnouncementOccurrence {
    id: string;
    date: string;
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
