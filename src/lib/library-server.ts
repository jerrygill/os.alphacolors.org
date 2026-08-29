import 'server-only';

import {getDatabase} from './db';
import {normalizeAnnouncementOccurrences} from './announcement-utils';
import {Announcement, AnnouncementPriority, LibraryKind, Song} from './library-types';

type Database = NonNullable<ReturnType<typeof getDatabase>>;
type DatabaseRow = Record<string, unknown>;
const tableInitialization = new Map<LibraryKind, Promise<void>>();

async function initializeLibraryTable(sql: Database, kind: LibraryKind): Promise<void> {
    if (kind === 'songs') {
        await sql`
            CREATE TABLE IF NOT EXISTS os_songs (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                artist TEXT NOT NULL DEFAULT '',
                default_key TEXT NOT NULL DEFAULT '',
                bpm INTEGER,
                notes TEXT NOT NULL DEFAULT '',
                reference_url TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        return;
    }

    await sql`
        CREATE TABLE IF NOT EXISTS os_announcements (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            body TEXT NOT NULL DEFAULT '',
            speaker TEXT NOT NULL DEFAULT '',
            start_date DATE,
            end_date DATE,
            occurrences JSONB NOT NULL DEFAULT '[]'::jsonb,
            remarks TEXT NOT NULL DEFAULT '',
            priority TEXT NOT NULL DEFAULT 'low',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await sql`
        ALTER TABLE os_announcements
            ADD COLUMN IF NOT EXISTS occurrences JSONB NOT NULL DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS remarks TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS speaker TEXT NOT NULL DEFAULT '';
    `;
    await sql`
        ALTER TABLE os_announcements
            ALTER COLUMN priority SET DEFAULT 'low';
    `;
}

export async function ensureLibraryTable(sql: Database, kind: LibraryKind): Promise<void> {
    let initialization = tableInitialization.get(kind);
    if (!initialization) {
        initialization = initializeLibraryTable(sql, kind);
        tableInitialization.set(kind, initialization);
    }

    try {
        await initialization;
    } catch (error) {
        if (tableInitialization.get(kind) === initialization) tableInitialization.delete(kind);
        throw error;
    }
}

function asDateString(value: unknown): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
}

function asIsoString(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    return value ? new Date(String(value)).toISOString() : new Date().toISOString();
}

export function mapSong(row: DatabaseRow): Song {
    return {
        id: String(row.id),
        title: String(row.title || ''),
        artist: String(row.artist || ''),
        defaultKey: String(row.default_key || ''),
        bpm: row.bpm == null ? null : Number(row.bpm),
        notes: String(row.notes || ''),
        referenceUrl: String(row.reference_url || ''),
        createdAt: asIsoString(row.created_at),
        updatedAt: asIsoString(row.updated_at),
    };
}

export function mapAnnouncement(row: DatabaseRow): Announcement {
    const priority = String(row.priority || 'low') as AnnouncementPriority;
    return {
        id: String(row.id),
        title: String(row.title || ''),
        body: String(row.body || ''),
        speaker: String(row.speaker || ''),
        startDate: asDateString(row.start_date),
        endDate: asDateString(row.end_date),
        occurrences: normalizeAnnouncementOccurrences(row.occurrences),
        remarks: String(row.remarks || ''),
        priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'low',
        isActive: Boolean(row.is_active),
        createdAt: asIsoString(row.created_at),
        updatedAt: asIsoString(row.updated_at),
    };
}
