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
        if (announcement.speaker !== undefined && typeof announcement.speaker !== 'string') {
            return NextResponse.json({error: 'Speaker must be text.'}, {status: 400});
        }
        const hasField = (field: keyof AnnouncementInput) => (
            Object.prototype.hasOwnProperty.call(announcement, field)
        );
        const hasOccurrences = hasField('occurrences');
        if (hasOccurrences && !isAnnouncementOccurrencesInput(announcement.occurrences)) {
            return NextResponse.json({error: 'Occurrences must be a valid list.'}, {status: 400});
        }

        const priority = ['low', 'medium', 'high'].includes(announcement.priority || '')
            ? announcement.priority
            : 'medium';
        const occurrences = normalizeAnnouncementOccurrences(
            announcement.occurrences,
            () => randomUUID(),
        );
        const rows = await sql`
            UPDATE os_announcements SET
                title = ${announcement.title.trim()},
                body = CASE
                    WHEN ${hasField('body')} THEN ${announcement.body?.trim() || ''}
                    ELSE body
                END,
                speaker = CASE
                    WHEN ${hasField('speaker')} THEN ${announcement.speaker?.trim() || ''}
                    ELSE speaker
                END,
                start_date = CASE
                    WHEN ${hasField('startDate')} THEN ${announcement.startDate || null}::date
                    ELSE start_date
                END,
                end_date = CASE
                    WHEN ${hasField('endDate')} THEN ${announcement.endDate || null}::date
                    ELSE end_date
                END,
                occurrences = CASE
                    WHEN ${hasOccurrences} THEN ${JSON.stringify(occurrences)}::jsonb
                    ELSE occurrences
                END,
                remarks = CASE
                    WHEN ${hasField('remarks')} THEN ${announcement.remarks?.trim() || ''}
                    ELSE remarks
                END,
                priority = CASE
                    WHEN ${hasField('priority')} THEN ${priority}
                    ELSE priority
                END,
                is_active = CASE
                    WHEN ${hasField('isActive')} THEN ${announcement.isActive ?? true}
                    ELSE is_active
                END,
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
