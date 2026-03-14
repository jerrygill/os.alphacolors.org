import { ScheduleItem } from '@/lib/types';
import { CustomAct, OverrideData } from '@/lib/storage';
import { addMinutesToTime } from '@/lib/time-utils';

/**
 * Merges the base schedule with overrides and custom acts,
 * and dynamically calculates all times based on durations.
 */
export function recalculateSchedule(
    baseSchedule: ScheduleItem[],
    overrides: OverrideData,
    customActs: CustomAct[]
): ScheduleItem[] {
    if (!baseSchedule || baseSchedule.length === 0) return [...customActs];

    // 1. Apply raw overrides to base schedule directly
    let mergedSchedule = baseSchedule.map(item => ({
        ...item,
        timeFrom: overrides[`${item.id}-timeFrom`] || item.timeFrom,
        timeTo: overrides[`${item.id}-timeTo`] || item.timeTo,
        duration: overrides[`${item.id}-duration`] || item.duration,
        event: overrides[`${item.id}-event`] || item.event,
        host: overrides[`${item.id}-host`] || item.host,
        remarks: overrides[`${item.id}-remarks`] || item.remarks,
    }));

    // 2. Insert Custom Acts at their specified positions
    // We do this by finding the index of the insertAfterId.
    // Acts without an insertAfterId or where the ID isn't found go to the end.
    const finalSequence: ScheduleItem[] = [];
    
    // Create a pool of custom acts that need placing
    const pendingActs = [...customActs].map(act => ({
        ...act,
        timeFrom: overrides[`${act.id}-timeFrom`] || act.timeFrom,
        timeTo: overrides[`${act.id}-timeTo`] || act.timeTo,
        duration: overrides[`${act.id}-duration`] || act.duration,
        event: overrides[`${act.id}-event`] || act.event,
        host: overrides[`${act.id}-host`] || act.host,
        remarks: overrides[`${act.id}-remarks`] || act.remarks,
    }));

    mergedSchedule.forEach(baseItem => {
        finalSequence.push(baseItem);

        // Find any custom acts that want to be exactly right after this item
        // We use a while loop in case multiple custom acts want to be inserted after the same base item,
        // although standard UI handles one at a time. This allows ordered chaining if they stack.
        let actsToInsert = pendingActs.filter(a => a.insertAfterId === baseItem.id);
        
        // Remove inserted acts from pending pool
        actsToInsert.forEach(a => {
            const idx = pendingActs.findIndex(p => p.id === a.id);
            if (idx > -1) pendingActs.splice(idx, 1);
        });

        // Add them to the sequence
        finalSequence.push(...actsToInsert);
    });

    // Any remaining acts (orphans or explicitly meant for the end) get appended
    finalSequence.push(...pendingActs);

    // 3. Dynamic Time Calculation (The Cascade)
    let currentStartTime = finalSequence[0]?.timeFrom || '12:00 AM';

    return finalSequence.map((item, index) => {
        // If it's the very first item, we respect its timeFrom (it's the anchor)
        // For all other items, the start time is dictated by the previous item's end time.
        const effectiveStartTime = index === 0 ? item.timeFrom : currentStartTime;

        // Calculate end time based on effective start time and duration
        const durationMins = parseInt(item.duration, 10);
        let effectiveEndTime = item.timeTo;

        if (!isNaN(durationMins)) {
            effectiveEndTime = addMinutesToTime(effectiveStartTime, durationMins);
        }

        // Update currentStartTime for the NEXT iteration
        currentStartTime = effectiveEndTime;

        return {
            ...item,
            timeFrom: effectiveStartTime,
            timeTo: effectiveEndTime
        };
    });
}
