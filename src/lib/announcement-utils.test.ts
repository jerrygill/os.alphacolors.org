import {describe, expect, it} from 'vitest';
import {
    isAnnouncementOccurrencesInput,
    normalizeAnnouncementOccurrences,
} from './announcement-utils';

describe('announcement occurrence normalization', () => {
    it('normalizes a recurring weekday occurrence', () => {
        expect(normalizeAnnouncementOccurrences([
            {id: 'weekly', recurringDay: 'Wednesday', time: '19:30', note: 'Alpha Colors'},
        ])).toEqual([
            {
                id: 'weekly',
                date: '',
                recurringDay: 'wednesday',
                time: '19:30',
                note: 'Alpha Colors',
            },
        ]);
    });

    it('keeps legacy dated occurrences compatible', () => {
        expect(normalizeAnnouncementOccurrences([
            {id: 'dated', date: '2026-08-30', time: '', note: ''},
        ])).toEqual([
            {
                id: 'dated',
                date: '2026-08-30',
                recurringDay: '',
                time: '',
                note: '',
            },
        ]);
    });

    it('keeps a recurring-only row and clears a conflicting date', () => {
        expect(normalizeAnnouncementOccurrences([
            {id: 'weekly', date: '2026-08-30', recurringDay: 'monday'},
        ])[0]).toMatchObject({date: '', recurringDay: 'monday'});
    });

    it('rejects invalid recurring weekdays at the API boundary', () => {
        expect(isAnnouncementOccurrencesInput([{recurringDay: 'someday'}])).toBe(false);
        expect(isAnnouncementOccurrencesInput([{recurringDay: 'friday'}])).toBe(true);
    });
});
