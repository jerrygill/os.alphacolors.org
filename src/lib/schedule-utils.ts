import { ScheduleItem } from './types';
import { OverrideData, CustomAct } from './storage';
import { addMinutesToTime } from './time-utils';

export function recalculateSchedule(
    baseSchedule: ScheduleItem[],
    overrides: OverrideData,
    customActs: CustomAct[],
    rowOrder: string[] | null = null
): ScheduleItem[] {
    if (!baseSchedule || baseSchedule.length === 0) return [...customActs];

    // 1. Apply raw overrides to base schedule directly AND filter out hidden ones
    let mergedSchedule = baseSchedule
        .filter(item => overrides[`${item.id}-hidden`] !== 'true')
        .map(item => ({
            ...item,
            timeFrom: overrides[`${item.id}-timeFrom`] || item.timeFrom,
            timeTo: overrides[`${item.id}-timeTo`] || item.timeTo,
            duration: overrides[`${item.id}-duration`] || item.duration,
            event: overrides[`${item.id}-event`] || item.event,
            host: overrides[`${item.id}-host`] || item.host,
            remarks: overrides[`${item.id}-remarks`] || item.remarks,
        }));

    // 2. Map custom acts with overrides AND filter out hidden ones
    const mappedActs = [...customActs]
        .filter(act => overrides[`${act.id}-hidden`] !== 'true')
        .map(act => ({
            ...act,
            timeFrom: overrides[`${act.id}-timeFrom`] || act.timeFrom,
            timeTo: overrides[`${act.id}-timeTo`] || act.timeTo,
            duration: overrides[`${act.id}-duration`] || act.duration,
            event: overrides[`${act.id}-event`] || act.event,
            host: overrides[`${act.id}-host`] || act.host,
            remarks: overrides[`${act.id}-remarks`] || act.remarks,
        }));

    // 3. Combine them into a single sequence
    let finalSequence: ScheduleItem[] = [];

    if (rowOrder && rowOrder.length > 0) {
        // If rowOrder exists, it dictates the master sorting purely
        const idMap = new Map<string, ScheduleItem>();
        mergedSchedule.forEach(i => idMap.set(i.id, i));
        mappedActs.forEach(i => idMap.set(i.id, i));

        rowOrder.forEach(id => {
            if (idMap.has(id)) {
                finalSequence.push(idMap.get(id)!);
                idMap.delete(id);
            }
        });

        // Add any remaining items that weren't in rowOrder (e.g. newly added acts via code updates) to the end
        if (idMap.size > 0) {
            finalSequence = finalSequence.concat(Array.from(idMap.values()));
        }

    } else {
        // Fallback: Default Insertion logic (if no rowOrder is saved yet)
        const pendingActs = [...mappedActs];
        mergedSchedule.forEach(baseItem => {
            finalSequence.push(baseItem);

            // Find custom acts that want to be inserted after this item
            let actsToInsert = pendingActs.filter(a => a.insertAfterId === baseItem.id);
            
            // Remove from pending
            actsToInsert.forEach(a => {
                const idx = pendingActs.findIndex(p => p.id === a.id);
                if (idx > -1) pendingActs.splice(idx, 1);
            });

            finalSequence.push(...actsToInsert);
        });

        // Any remaining orphans
        finalSequence.push(...pendingActs);
    }

    // 4. Dynamic Time Calculation (The Cascade)
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
