'use client';

import { useEffect, useState } from 'react';
import { fetchSheetData } from '@/lib/sheets';
import { getSheetGid, getWeekKey } from '@/lib/date-utils';
import { getOverrides, getCustomActs, OverrideData } from '@/lib/storage';
import { ServiceData, ScheduleItem } from '@/lib/types';
import ServiceHeader from '@/components/ServiceHeader';
import ScheduleTable from '@/components/ScheduleTable';

export default function Home() {
    const [data, setData] = useState<ServiceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            const today = new Date();
            const gid = getSheetGid(today);
            const weekKey = getWeekKey(today);

            try {
                const sheetData = await fetchSheetData(gid);

                // Apply Local Overrides
                const overrides: OverrideData = getOverrides(weekKey);
                const customActs = getCustomActs(weekKey);

                // Apply Host Override
                if (overrides['host']) sheetData.host = overrides['host'];
                if (overrides['date']) sheetData.date = overrides['date'];
                if (overrides['title']) sheetData.title = overrides['title'];

                // Apply Team Overrides
                Object.keys(sheetData.team).forEach(role => {
                    if (overrides[`team-${role}`]) {
                        sheetData.team[role] = overrides[`team-${role}`];
                    }
                });

                // Apply Schedule Overrides and Merge Custom Acts
                // We need to map schedule items to handle overrides by ID (row index)
                const mergedSchedule = sheetData.schedule.map(item => {
                    const id = item.id;
                    return {
                        ...item,
                        timeFrom: overrides[`${id}-timeFrom`] || item.timeFrom,
                        timeTo: overrides[`${id}-timeTo`] || item.timeTo,
                        duration: overrides[`${id}-duration`] || item.duration,
                        event: overrides[`${id}-event`] || item.event,
                        host: overrides[`${id}-host`] || item.host,
                        remarks: overrides[`${id}-remarks`] || item.remarks,
                    };
                });

                // Add custom acts
                // For simplicity, we just append them for now. 
                // A more complex logic could insert them based on time, but simple append/inject is safer.
                // Or we could sort by time effectively.
                const allSchedule = [...mergedSchedule, ...customActs];

                // Simple sort by time if available (optional, but good for custom acts placement)
                // allSchedule.sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));

                sheetData.schedule = allSchedule;

                setData(sheetData);
            } catch (error) {
                console.error('Failed to load data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 w-48 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500">
                Failed to load service data.
            </div>
        );
    }

    return (
        <main className="min-h-screen p-4 md:p-8 bg-white dark:bg-black text-foreground pb-20">
            <ServiceHeader data={data} />
            <ScheduleTable schedule={data.schedule} />
        </main>
    );
}
