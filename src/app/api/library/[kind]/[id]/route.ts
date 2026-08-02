import {NextRequest, NextResponse} from 'next/server';
import {hasAdminSession} from '@/lib/admin-auth';
import {getDatabase} from '@/lib/db';
import {ensureLibraryTable, mapAnnouncement, mapSong} from '@/lib/library-server';
import {AnnouncementInput, LibraryKind, SongInput} from '@/lib/library-types';

function isKind(value: string): value is LibraryKind {
    return value === 'songs' || value === 'announcements';
}

export async function PUT(
    request: NextRequest,
    context: {params: Promise<{kind: string; id: string}>},
) {
    const {kind, id} = await context.params;
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
        if (kind === 'songs') {
            const song = body as SongInput;
            const rows = await sql`
                UPDATE os_songs SET
                    title = ${song.title.trim()}, artist = ${song.artist?.trim() || ''},
                    default_key = ${song.defaultKey?.trim() || ''}, bpm = ${song.bpm ?? null},
                    notes = ${song.notes?.trim() || ''},
                    reference_url = ${song.referenceUrl?.trim() || ''},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${id}
                RETURNING *;
            `;
            if (!rows.length) return NextResponse.json({error: 'Song not found.'}, {status: 404});
            return NextResponse.json({item: mapSong(rows[0])});
        }

        const announcement = body as AnnouncementInput;
        const priority = ['low', 'medium', 'high'].includes(announcement.priority || '')
            ? announcement.priority
            : 'medium';
        const rows = await sql`
            UPDATE os_announcements SET
                title = ${announcement.title.trim()}, body = ${announcement.body?.trim() || ''},
                start_date = ${announcement.startDate || null}, end_date = ${announcement.endDate || null},
                priority = ${priority}, is_active = ${announcement.isActive ?? true},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id}
            RETURNING *;
        `;
        if (!rows.length) return NextResponse.json({error: 'Announcement not found.'}, {status: 404});
        return NextResponse.json({item: mapAnnouncement(rows[0])});
    } catch (error) {
        console.error('Library PUT error:', error);
        return NextResponse.json({error: 'Unable to update the item.'}, {status: 500});
    }
}

export async function DELETE(
    _request: NextRequest,
    context: {params: Promise<{kind: string; id: string}>},
) {
    const {kind, id} = await context.params;
    if (!isKind(kind)) return NextResponse.json({error: 'Unknown library.'}, {status: 404});
    if (!(await hasAdminSession())) {
        return NextResponse.json({error: 'Admin access required.'}, {status: 401});
    }

    const sql = getDatabase();
    if (!sql) return NextResponse.json({error: 'Database not configured.'}, {status: 503});

    try {
        await ensureLibraryTable(sql, kind);
        const rows = kind === 'songs'
            ? await sql`DELETE FROM os_songs WHERE id = ${id} RETURNING id;`
            : await sql`DELETE FROM os_announcements WHERE id = ${id} RETURNING id;`;
        if (!rows.length) return NextResponse.json({error: 'Item not found.'}, {status: 404});
        return NextResponse.json({deleted: true});
    } catch (error) {
        console.error('Library DELETE error:', error);
        return NextResponse.json({error: 'Unable to delete the item.'}, {status: 500});
    }
}
