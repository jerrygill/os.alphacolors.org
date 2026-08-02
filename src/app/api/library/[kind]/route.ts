import {randomUUID} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {hasAdminSession} from '@/lib/admin-auth';
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
            const rows = await sql`SELECT * FROM os_songs ORDER BY LOWER(title), LOWER(artist);`;
            return NextResponse.json({items: rows.map((row) => mapSong(row))});
        }
        const rows = await sql`
            SELECT * FROM os_announcements
            ORDER BY is_active DESC, start_date DESC NULLS LAST, LOWER(title);
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
        const priority = ['low', 'medium', 'high'].includes(announcement.priority || '')
            ? announcement.priority
            : 'medium';
        const rows = await sql`
            INSERT INTO os_announcements
                (id, title, body, start_date, end_date, priority, is_active)
            VALUES (
                ${id}, ${announcement.title.trim()}, ${announcement.body?.trim() || ''},
                ${announcement.startDate || null}, ${announcement.endDate || null},
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
