import type {
    Announcement,
    AnnouncementPriority,
    AnnouncementWeekday,
    Song,
} from '@/lib/library-types';
import type {ScheduleItem} from '@/lib/types';

export interface SongDetail {
    id: string;
    title: string;
    artist?: string;
    defaultKey?: string;
    bpm?: number | null;
    notes?: string;
    referenceUrl?: string;
}

export interface AnnouncementDetail {
    id: string;
    title: string;
    body?: string;
    speaker?: string;
    occurrences: AnnouncementOccurrenceDetail[];
    remarks?: string;
    priority: AnnouncementPriority;
}

export interface AnnouncementOccurrenceDetail {
    id: string;
    date?: string;
    recurringDay?: AnnouncementWeekday;
    time?: string;
    dateLabel?: string;
    timeLabel?: string;
    note?: string;
}

export type ServiceDetail =
    | {kind: 'songs'; title: string; items: SongDetail[]}
    | {kind: 'announcements'; title: string; items: AnnouncementDetail[]};

export type ServiceContentKind = ServiceDetail['kind'];

export function normalizeServiceText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

interface NumberedRemark {
    prefix: string;
    items: string[];
}

const ANNOUNCEMENT_EVENTS = new Set(['announcement', 'announcements']);
const SONG_EVENTS = new Set(['praise', 'worship', 'praise worship', 'praise and worship']);

export function getServiceContentKind(
    item: Pick<ScheduleItem, 'event'>,
): ServiceContentKind | null {
    const eventName = normalizeServiceText(item.event);
    if (ANNOUNCEMENT_EVENTS.has(eventName)) return 'announcements';
    if (SONG_EVENTS.has(eventName)) return 'songs';
    return null;
}

function getNumberedRemark(value: string): NumberedRemark {
    const cleaned = value.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').trim();
    const markers = Array.from(cleaned.matchAll(/(?:^|\s)(\d+)[.)]\s+/g));

    if (!markers.length) return {prefix: cleaned, items: []};

    const items = markers
        .map((marker, index) => {
            const start = (marker.index ?? 0) + marker[0].length;
            const end = markers[index + 1]?.index ?? cleaned.length;
            return cleaned.slice(start, end).replace(/\s*[+:]\s*$/, '').trim();
        })
        .filter(Boolean);

    return {
        prefix: cleaned.slice(0, markers[0].index ?? 0).trim(),
        items,
    };
}

const MONTH_PATTERN = String.raw`(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)`;
const WEEKDAY_PATTERN = String.raw`(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)`;
const DATE_PATTERN = String.raw`\d{1,2}(?:st|nd|rd|th)?(?:\s+to\s+\d{1,2}(?:st|nd|rd|th)?)?\s+${MONTH_PATTERN}(?:\s+\d{4})?(?:\s*\(${WEEKDAY_PATTERN}\))?`;
const TIME_PATTERN = String.raw`\d{1,2}(?:[.:]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)`;
const DATE_TIME_LINE = new RegExp(`^(${DATE_PATTERN})(?:\\s*(?:[-–—]|at)\\s*)(${TIME_PATTERN})(?:\\s+at\\s+(.+))?$`, 'i');
const DATE_ONLY_LINE = new RegExp(`^(${DATE_PATTERN})$`, 'i');
const TIME_ONLY_LINE = new RegExp(`^(${TIME_PATTERN})(?:\\s+(.+))?$`, 'i');

function occurrenceFromLine(
    value: string,
    id: string,
): AnnouncementOccurrenceDetail | null {
    const hadBullet = /^\s*[-–—•]\s*/.test(value);
    const text = value.replace(/^\s*[-–—•]\s*/, '').trim();
    const dateTime = text.match(DATE_TIME_LINE);
    if (dateTime) {
        return {
            id,
            dateLabel: dateTime[1].trim(),
            timeLabel: dateTime[2].replace(/\s+/g, '').trim(),
            note: dateTime[3]?.trim(),
        };
    }

    const dateOnly = text.match(DATE_ONLY_LINE);
    if (dateOnly) return {id, dateLabel: dateOnly[1].trim()};

    const timeOnly = text.match(TIME_ONLY_LINE);
    if (
        timeOnly
        && (hadBullet || !timeOnly[2] || /^\([^)]*\)$/.test(timeOnly[2].trim()))
    ) {
        return {
            id,
            timeLabel: timeOnly[1].replace(/\s+/g, '').trim(),
            note: timeOnly[2]?.trim(),
        };
    }

    return null;
}

function extractLegacyAnnouncementSchedule(
    value: string,
    announcementId: string,
): Pick<AnnouncementDetail, 'body' | 'occurrences'> {
    const occurrences: AnnouncementOccurrenceDetail[] = [];
    const bodyLines: string[] = [];

    value.split(/\n+/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
        const occurrenceId = `${announcementId}-occurrence-${occurrences.length}`;
        const wholeLine = occurrenceFromLine(line, occurrenceId);
        if (wholeLine) {
            occurrences.push(wholeLine);
            return;
        }

        const trailingSchedule = line.match(/^(.*)\s+[-–—]\s+(.+)$/);
        if (trailingSchedule) {
            const occurrence = occurrenceFromLine(trailingSchedule[2], occurrenceId);
            if (occurrence) {
                const body = trailingSchedule[1].replace(/^\s*[-–—•]\s*/, '').trim();
                if (body) bodyLines.push(body);
                occurrences.push(occurrence);
                return;
            }
        }

        bodyLines.push(line.replace(/^\s*[-–—•]\s*/, '').trim());
    });

    return {
        body: bodyLines.filter(Boolean).join('\n'),
        occurrences,
    };
}

function splitLegacyAnnouncement(
    value: string,
    announcementId: string,
): Pick<AnnouncementDetail, 'title' | 'body' | 'occurrences'> {
    const text = value.trim();
    const [firstLine, ...remainingLines] = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (firstLine && remainingLines.length) {
        return {
            title: firstLine.replace(/:\s*$/, ''),
            ...extractLegacyAnnouncementSchedule(remainingLines.join('\n'), announcementId),
        };
    }

    const colon = text.indexOf(':');
    const isTimeColon = colon > 0 && /\d/.test(text[colon - 1] || '') && /\d/.test(text[colon + 1] || '');
    if (colon > 0 && colon < 48 && !isTimeColon) {
        const body = text.slice(colon + 1).trim();
        if (body) {
            return {
                title: text.slice(0, colon).trim(),
                ...extractLegacyAnnouncementSchedule(body, announcementId),
            };
        }
    }

    const divider = text.indexOf(' - ');
    if (divider > 0 && divider < 64) {
        return {
            title: text.slice(0, divider).trim(),
            ...extractLegacyAnnouncementSchedule(text.slice(divider + 3).trim(), announcementId),
        };
    }

    return {title: text.replace(/:\s*$/, ''), body: '', occurrences: []};
}

function splitLegacySong(value: string): Pick<SongDetail, 'title' | 'artist' | 'notes'> {
    let title = value.trim();
    let artist: string | undefined;
    let notes: string | undefined;

    const parenthetical = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (parenthetical) {
        const qualifier = parenthetical[2].trim();
        if (/\b(?:only|chorus|bridge|verse|intro|outro|tag|reprise|medley)\b/i.test(qualifier)) {
            title = parenthetical[1].trim();
            notes = qualifier;
        } else if (/^[\p{L}'’.&-]+(?:\s+[\p{L}'’.&-]+){0,2}$/u.test(qualifier)) {
            title = parenthetical[1].trim();
            artist = qualifier;
        }
    }

    const artistSuffix = title.match(/^(.*?)\s+[-–—]\s+(.+)$/);
    if (
        artistSuffix
        && /^(?:[\p{Lu}][\p{L}'’.]*|&|feat\.?|ft\.?)(?:\s+(?:[\p{Lu}][\p{L}'’.]*|&|feat\.?|ft\.?)){0,5}$/u.test(artistSuffix[2])
    ) {
        title = artistSuffix[1].trim();
        artist = artistSuffix[2].trim();
    }

    return {title, artist, notes};
}

function nativeSongs(songs: Song[]): SongDetail[] {
    return songs.map((song) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        defaultKey: song.defaultKey,
        bpm: song.bpm,
        notes: song.notes,
        referenceUrl: song.referenceUrl,
    }));
}

function nativeAnnouncements(announcements: Announcement[]): AnnouncementDetail[] {
    return announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        speaker: announcement.speaker,
        occurrences: (announcement.occurrences || []).map((occurrence) => ({
            id: occurrence.id,
            date: occurrence.date,
            recurringDay: occurrence.recurringDay || undefined,
            time: occurrence.time,
            note: occurrence.note,
        })),
        remarks: announcement.remarks,
        priority: announcement.priority,
    }));
}

function legacySongs(item: ScheduleItem): SongDetail[] {
    const numbered = getNumberedRemark(item.remarks || '');
    const prefix = normalizeServiceText(numbered.prefix.replace(/:\s*$/, ''));
    if (prefix && !['song', 'songs'].includes(prefix)) return [];

    return numbered.items.map((song, index) => ({
        id: `legacy-song-${index}`,
        ...splitLegacySong(song),
    }));
}

function legacyAnnouncements(item: ScheduleItem): AnnouncementDetail[] {
    const numbered = getNumberedRemark(item.remarks || '');
    const prefix = normalizeServiceText(numbered.prefix.replace(/:\s*$/, ''));
    if (prefix && !ANNOUNCEMENT_EVENTS.has(prefix)) return [];

    return numbered.items.map((announcement, index) => ({
        id: `legacy-announcement-${index}`,
        ...splitLegacyAnnouncement(announcement, `legacy-announcement-${index}`),
        priority: 'low',
    }));
}

export function isLegacyServiceDetailRemark(item: ScheduleItem): boolean {
    const kind = getServiceContentKind(item);
    if (kind === 'announcements') return legacyAnnouncements(item).length > 0;
    if (kind === 'songs') return legacySongs(item).length > 0;
    return false;
}

export function getServiceDetail(
    item: ScheduleItem,
    songs: Song[],
    announcements: Announcement[],
): ServiceDetail | null {
    const kind = getServiceContentKind(item);

    if (kind === 'announcements') {
        const items = nativeAnnouncements(announcements);
        if (items.length) {
            return {
                kind: 'announcements',
                title: 'Announcements',
                items,
            };
        }
    }

    if (kind === 'songs') {
        const items = nativeSongs(songs);
        if (items.length) {
            return {
                kind: 'songs',
                title: item.event,
                items,
            };
        }
    }

    return null;
}
