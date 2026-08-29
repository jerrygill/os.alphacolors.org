import {describe, expect, it} from 'vitest';
import {DEFAULT_WEEK_DATA} from './storage';
import {
    areWeekDraftsEqual,
    editableWeekData,
    moveId,
    moveIdByOffset,
} from './planner-draft';

describe('planner draft helpers', () => {
    it('compares only editable weekly fields', () => {
        const published = {
            ...DEFAULT_WEEK_DATA,
            status: 'published' as const,
            publishedAt: '2026-08-30T00:00:00.000Z',
        };

        expect(
            areWeekDraftsEqual(editableWeekData(DEFAULT_WEEK_DATA), editableWeekData(published)),
        ).toBe(true);
    });

    it('detects an editable change', () => {
        const changed = {...DEFAULT_WEEK_DATA, songIds: ['song-1']};
        expect(
            areWeekDraftsEqual(editableWeekData(DEFAULT_WEEK_DATA), editableWeekData(changed)),
        ).toBe(false);
    });

    it('moves an id to a drop target', () => {
        expect(moveId(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
    });

    it('moves an id by an accessible offset without crossing a boundary', () => {
        expect(moveIdByOffset(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
        expect(moveIdByOffset(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    });
});
