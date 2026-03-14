'use client';

import { useEffect, useState } from 'react';
import { fetchSheetData } from '@/lib/sheets';
import { getSheetGid, getWeekKey } from '@/lib/date-utils';
import { getWeekData, WeekData } from '@/lib/storage';
import { ServiceData, ScheduleItem } from '@/lib/types';
import { recalculateSchedule } from '@/lib/schedule-utils';
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

                // Fetch Cloud Sync Data
                const weekData: WeekData = await getWeekData(weekKey);
                const { overrides, customActs } = weekData;

                // Apply Host Override
                if (overrides['host']) sheetData.host = overrides['host'];
                if (overrides['date']) sheetData.date = overrides['date'];
                if (overrides['title']) sheetData.title = overrides['title'];
                if (overrides['serviceNotes']) sheetData.notes = overrides['serviceNotes'];

                // Apply Team Overrides
                Object.keys(sheetData.team).forEach(role => {
                    const overrideValue = overrides[`team-${role}`];
                    if (overrideValue !== undefined) {
                        sheetData.team[role] = overrideValue;
                    }
                });

                // Apply Schedule Overrides and Merge Custom Acts dynamically
                sheetData.schedule = recalculateSchedule(sheetData.schedule, overrides, customActs);

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
