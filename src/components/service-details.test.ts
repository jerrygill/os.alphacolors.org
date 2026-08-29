import {describe, expect, it} from 'vitest';
import type {Announcement} from '@/lib/library-types';
import type {ScheduleItem} from '@/lib/types';
import {getServiceDetail} from './service-details';

const announcementRow: ScheduleItem = {
    id: 'announcement-row',
    timeFrom: '9:35 AM',
    timeTo: '9:40 AM',
    duration: '5',
    event: 'Announcement',
    host: 'Rebecca',
    remarks: '',
};

const recurringAnnouncement: Announcement = {
    id: 'announcement-1',
    title: 'Prayer night',
    body: 'Join us for prayer.',
    speaker: 'Rebecca',
    startDate: '',
    endDate: '',
    occurrences: [{
        id: 'weekly',
        date: '',
        recurringDay: 'wednesday',
        time: '19:30',
        note: 'Alpha Colors',
    }],
    remarks: 'Bring a friend.',
    priority: 'low',
    isActive: true,
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
};

describe('native service details', () => {
    it('keeps recurring announcement schedule fields separate', () => {
        const detail = getServiceDetail(announcementRow, [], [recurringAnnouncement]);
        expect(detail?.kind).toBe('announcements');
        if (!detail || detail.kind !== 'announcements') return;

        expect(detail.items[0]?.occurrences[0]).toEqual({
            id: 'weekly',
            date: '',
            recurringDay: 'wednesday',
            time: '19:30',
            note: 'Alpha Colors',
        });
    });
});
