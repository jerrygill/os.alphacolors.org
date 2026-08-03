import type {Announcement, AnnouncementOccurrence} from './library-types';

type OccurrenceIdFactory = (index: number, attempt: number) => string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;
const CHURCH_TIME_ZONE = 'Asia/Kuala_Lumpur';
const CHURCH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: CHURCH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeDate(value: unknown): string {
    const date = normalizeText(value);
    const match = ISO_DATE_PATTERN.exec(date);
    if (!match) return '';

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day
        ? date
        : '';
}

function normalizeTime(value: unknown): string {
    const time = normalizeText(value);
    const match = ISO_TIME_PATTERN.exec(time);
    return match ? `${match[1]}:${match[2]}` : '';
}

function parseStoredValue(value: unknown): unknown {
    if (typeof value !== 'string') return value;

    try {
        return JSON.parse(value) as unknown;
    } catch {
        return [];
    }
}

/**
 * Validates the JSON-facing shape without requiring clients to pre-normalize
 * whitespace or generate occurrence IDs themselves.
 */
export function isAnnouncementOccurrencesInput(value: unknown): boolean {
    return Array.isArray(value) && value.every((entry) => (
        isRecord(entry)
        && (entry.id === undefined || typeof entry.id === 'string')
        && (
            entry.date === undefined
            || (
                typeof entry.date === 'string'
                && (!entry.date.trim() || Boolean(normalizeDate(entry.date)))
            )
        )
        && (
            entry.time === undefined
            || (
                typeof entry.time === 'string'
                && (!entry.time.trim() || Boolean(normalizeTime(entry.time)))
            )
        )
        && (entry.note === undefined || typeof entry.note === 'string')
    ));
}

/**
 * Converts persisted or submitted JSON into a safe, stable occurrence list.
 * Empty rows are discarded and missing/duplicate IDs receive a replacement.
 */
export function normalizeAnnouncementOccurrences(
    value: unknown,
    createId: OccurrenceIdFactory = (index, attempt) => (
        `occurrence-${index + 1}${attempt ? `-${attempt + 1}` : ''}`
    ),
): AnnouncementOccurrence[] {
    const parsed = parseStoredValue(value);
    if (!Array.isArray(parsed)) return [];

    const usedIds = new Set<string>();

    return parsed.flatMap((entry, index) => {
        if (!isRecord(entry)) return [];

        const date = normalizeDate(entry.date);
        const time = normalizeTime(entry.time);
        const note = normalizeText(entry.note);
        if (!date && !time && !note) return [];

        let id = normalizeText(entry.id);
        let attempt = 0;
        while (!id || usedIds.has(id)) {
            id = normalizeText(createId(index, attempt));
            attempt += 1;
            if (attempt > 100) return [];
        }
        usedIds.add(id);

        return [{id, date, time, note}];
    });
}

function dateFromReference(referenceDate: Date | string): string {
    if (typeof referenceDate === 'string') return normalizeDate(referenceDate);
    if (Number.isNaN(referenceDate.getTime())) return '';

    const parts = CHURCH_DATE_FORMATTER.formatToParts(referenceDate);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) return '';
    return `${year}-${month}-${day}`;
}

export function isAnnouncementVisible(
    announcement: Pick<Announcement, 'isActive' | 'startDate' | 'endDate'>,
    referenceDate: Date | string = new Date(),
): boolean {
    if (!announcement.isActive) return false;

    const date = dateFromReference(referenceDate);
    if (!date) return false;

    const startDate = normalizeDate(announcement.startDate);
    const endDate = normalizeDate(announcement.endDate);

    return (!startDate || startDate <= date) && (!endDate || date <= endDate);
}
