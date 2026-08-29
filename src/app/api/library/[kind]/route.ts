import {randomUUID} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {hasAdminSession} from '@/lib/admin-auth';
import {
    isAnnouncementOccurrencesInput,
    normalizeAnnouncementOccurrences,
} from '@/lib/announcement-utils';
import {getDatabase} from '@/lib/db';
import {ensureLibraryTable, mapAnnouncement, mapSong} from '@/lib/library-server';
import {AnnouncementInput, LibraryKind, SongInput} from '@/lib/library-types';

function isKind(value: string): value is LibraryKind {
    return value === 'songs' || value === 'announcements';
}

export async function GET(
    _request: NextRequest,
    context: {params: Promise<{kind: string}>},
) {
    const {kind} = await context.params;
    if (!isKind(kind)) return NextResponse.json({error: 'Unknown library.'}, {status: 404});

    const sql = getDatabase();
    if (!sql) return NextResponse.json({error: 'Database not configured.'}, {status: 503});

    try {
        await ensureLibraryTable(sql, kind);
        if (kind === 'songs') {
            const rows = await sql`SELECT * FROM os_songs ORDER BY created_at, id;`;
            return NextResponse.json({items: rows.map((row) => mapSong(row))});
        }
        const rows = await sql`
            SELECT * FROM os_announcements
            ORDER BY created_at, id;
        `;
        return NextResponse.json({items: rows.map((row) => mapAnnouncement(row))});
    } catch (error) {
        console.error('Library GET error:', error);
        return NextResponse.json({error: 'Unable to load the library.'}, {status: 500});
    }
}

export async function POST(
    request: NextRequest,
    context: {params: Promise<{kind: string}>},
) {
    const {kind} = await context.params;
    if (!isKind(kind)) return NextResponse.json({error: 'Unknown library.'}, {status: 404});
    if (!(await hasAdminSession())) {
        return NextResponse.json({error: 'Admin access required.'}, {status: 401});
    }

    const sql = getDatabase();
    if (!sql) return NextResponse.json({error: 'Database not configured.'}, {status: 503});
    const body = await request.json().catch(() => null) as SongInput | AnnouncementInput | null;
    if (!body?.title?.trim()) return NextResponse.json({error: 'Title is required.'}, {status: 400});

    try {
        await ensureLibraryTable(sql, kind);
        const id = randomUUID();
        if (kind === 'songs') {
            const song = body as SongInput;
            const rows = await sql`
                INSERT INTO os_songs (id, title, artist, default_key, bpm, notes, reference_url)
                VALUES (
                    ${id}, ${song.title.trim()}, ${song.artist?.trim() || ''},
                    ${song.defaultKey?.trim() || ''}, ${song.bpm ?? null},
                    ${song.notes?.trim() || ''}, ${song.referenceUrl?.trim() || ''}
                )
                RETURNING *;
            `;
            return NextResponse.json({item: mapSong(rows[0])}, {status: 201});
        }

        const announcement = body as AnnouncementInput;
        if (announcement.speaker !== undefined && typeof announcement.speaker !== 'string') {
            return NextResponse.json({error: 'Speaker must be text.'}, {status: 400});
        }
        if (
            announcement.occurrences !== undefined
            && !isAnnouncementOccurrencesInput(announcement.occurrences)
        ) {
            return NextResponse.json({error: 'Occurrences must be a valid list.'}, {status: 400});
        }
        const priority = ['low', 'medium', 'high'].includes(announcement.priority || '')
            ? announcement.priority
            : 'low';
        const occurrences = normalizeAnnouncementOccurrences(
            announcement.occurrences,
            () => randomUUID(),
        );
        const rows = await sql`
            INSERT INTO os_announcements
                (id, title, body, speaker, start_date, end_date, occurrences, remarks, priority, is_active)
            VALUES (
                ${id}, ${announcement.title.trim()}, ${announcement.body?.trim() || ''},
                ${announcement.speaker?.trim() || ''},
                ${announcement.startDate || null}, ${announcement.endDate || null},
                ${JSON.stringify(occurrences)}::jsonb, ${announcement.remarks?.trim() || ''},
                ${priority}, ${announcement.isActive ?? true}
            )
            RETURNING *;
        `;
        return NextResponse.json({item: mapAnnouncement(rows[0])}, {status: 201});
    } catch (error) {
        console.error('Library POST error:', error);
        return NextResponse.json({error: 'Unable to create the item.'}, {status: 500});
    }
}
