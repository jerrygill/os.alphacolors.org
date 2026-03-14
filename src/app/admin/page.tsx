'use client';

import React, { useEffect, useState } from 'react';
import { fetchSheetData } from '@/lib/sheets';
import { getSheetGid, getWeekKey } from '@/lib/date-utils';
import { getWeekData, saveWeekData, clearWeekData, OverrideData, CustomAct, WeekData } from '@/lib/storage';
import { ServiceData } from '@/lib/types';
import { recalculateSchedule } from '@/lib/schedule-utils';
import { getMinutesDifference } from '@/lib/time-utils';
import EditableCell from '@/components/EditableCell';
import AddPerformance from '@/components/AddPerformance';
import Link from 'next/link';

export default function AdminPage() {
    const [data, setData] = useState<ServiceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [overrides, setOverrides] = useState<OverrideData>({});
    const [customActs, setCustomActs] = useState<CustomAct[]>([]);
    const [rowOrder, setRowOrder] = useState<string[] | null>(null);
    const [insertingAfterId, setInsertingAfterId] = useState<string | null>(null);
    const [duplicatingItemData, setDuplicatingItemData] = useState<Partial<CustomAct> | null>(null);

    // We need to keep track of date to ensure we are editing same week
    const [currentWeekKey, setCurrentWeekKey] = useState<string>('');

    const loadData = async () => {
        setLoading(true);
        const today = new Date();
        const gid = getSheetGid(today);
        const weekKey = getWeekKey(today);
        setCurrentWeekKey(weekKey);

        try {
            const sheetData = await fetchSheetData(gid);

            // Fetch Cloud Sync Data
            const weekData: WeekData = await getWeekData(weekKey);
            
            setOverrides(weekData.overrides);
            setCustomActs(weekData.customActs);
            setRowOrder(weekData.rowOrder);

            setData(sheetData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const computedSchedule = data ? recalculateSchedule(data.schedule, overrides, customActs, rowOrder) : [];

    const handleMove = async (index: number, direction: -1 | 1) => {
        if (index + direction < 0 || index + direction >= computedSchedule.length) return;

        // Create current implicit order if rowOrder is null
        const currentOrder = rowOrder || computedSchedule.map(item => item.id);
        
        // Ensure the currentOrder actually reflects the computedSchedule in case of orphans
        // But for swapping, it's safer to just swap the IDs in a newly derived array based exactly on computedSchedule
        const newOrder = computedSchedule.map(item => item.id);
        
        // Swap
        const temp = newOrder[index];
        newOrder[index] = newOrder[index + direction];
        newOrder[index + direction] = temp;

        setRowOrder(newOrder); // Optimistic
        await saveWeekData(currentWeekKey, { rowOrder: newOrder });
    };

    const handleCellSave = async (id: string, value: string) => {
        let finalId = id;
        let finalValue = value;

        // Smart Time Handling
        if (id.endsWith('-timeTo') || id.endsWith('-timeFrom')) {
            const isFrom = id.endsWith('-timeFrom');
            const rowId = id.replace(isFrom ? '-timeFrom' : '-timeTo', '');
            const itemIndex = computedSchedule.findIndex(item => item.id === rowId);

            if (itemIndex > -1) {
                if (isFrom && itemIndex > 0) {
                    const prevItem = computedSchedule[itemIndex - 1];
                    const diff = getMinutesDifference(prevItem.timeFrom, value);
                    if (diff !== null && diff >= 0) {
                        finalId = `${prevItem.id}-duration`;
                        finalValue = diff.toString();
                    }
                } else if (!isFrom) {
                    const currItem = computedSchedule[itemIndex];
                    const diff = getMinutesDifference(currItem.timeFrom, value);
                    if (diff !== null && diff >= 0) {
                        finalId = `${rowId}-duration`;
                        finalValue = diff.toString();
                    }
                }
            }
        }

        const newOverrides = { ...overrides, [finalId]: finalValue };
        setOverrides(newOverrides); // Optimistic UI update
        await saveWeekData(currentWeekKey, { overrides: newOverrides });
    };

    const handleAddAct = async (actData: Omit<CustomAct, 'id' | 'isNew' | 'insertAfterId'>, insertAfterId?: string) => {
        const newAct: CustomAct = {
            ...actData,
            id: `custom-${Date.now()}`,
            isNew: true,
            insertAfterId
        };
        const newActs = [...customActs, newAct];
        setCustomActs(newActs); // Optimistic UI update
        setInsertingAfterId(null);
        setDuplicatingItemData(null);
        await saveWeekData(currentWeekKey, { customActs: newActs });
    };

    const handleDeleteAct = async (id: string) => {
        if (confirm('Are you sure you want to delete this added item?')) {
            const newActs = customActs.filter(a => a.id !== id);
            setCustomActs(newActs); // Optimistic UI
            await saveWeekData(currentWeekKey, { customActs: newActs });
        }
    };

    const handleReset = async () => {
        if (confirm('This will clear ALL local edits for this week. Are you sure?')) {
            await clearWeekData(currentWeekKey);
            window.location.reload();
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Admin...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Error loading data.</div>;

    // Helper to get display value (override or original)
    const getVal = (id: string, original: string) => overrides[id] !== undefined ? overrides[id] : original;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">← Back to Site</Link>
                        <h1 className="text-xl font-bold border-l border-gray-300 pl-4 ml-4">Admin Dashboard</h1>
                    </div>

                    <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500 hidden md:block">
                            Week: {currentWeekKey}
                        </span>
                        <button
                            onClick={handleReset}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                        >
                            Reset Changes
                        </button>
                        <a
                            href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_SHEET_ID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                        >
                            Open Google Sheet
                        </a>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Header Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm mb-8">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Service Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <label className="text-xs font-medium text-gray-500 mb-1">Service Title</label>
                                <div className="text-xl font-bold">
                                    <EditableCell
                                        initialValue={getVal('title', data.title)}
                                        onSave={(v) => handleCellSave('title', v)}
                                        isOverridden={!!overrides['title']}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1">Date</label>
                                    <EditableCell
                                        initialValue={getVal('date', data.date)}
                                        onSave={(v) => handleCellSave('date', v)}
                                        isOverridden={!!overrides['date']}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1">Host</label>
                                    <EditableCell
                                        initialValue={getVal('host', data.host)}
                                        onSave={(v) => handleCellSave('host', v)}
                                        isOverridden={!!overrides['host']}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {Object.entries(data.team).map(([role, name]) => (
                                <div key={role} className="flex flex-col md:flex-row md:items-center justify-between border-b dark:border-gray-800 pb-2">
                                    <span className="text-sm font-medium text-gray-500 w-32">{role}</span>
                                    <div className="flex-1">
                                        <EditableCell
                                            initialValue={getVal(`team-${role}`, name)}
                                            onSave={(v) => handleCellSave(`team-${role}`, v)}
                                            isOverridden={!!overrides[`team-${role}`]}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Schedule Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Schedule</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="p-4 w-32">Time</th>
                                    <th className="p-4 w-20">Dur</th>
                                    <th className="p-4 w-1/4">Event</th>
                                    <th className="p-4 w-1/5">Host</th>
                                    <th className="p-4">Remarks</th>
                                    <th className="p-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {computedSchedule.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                    <tr className={item.isCustom ? 'bg-blue-50/30' : ''}>
                                        <td className="p-4 align-top">
                                            <div className="space-y-1">
                                                <EditableCell
                                                    initialValue={item.timeFrom}
                                                    onSave={(v) => handleCellSave(`${item.id}-timeFrom`, v)}
                                                    isOverridden={!!overrides[`${item.id}-timeFrom`]}
                                                />
                                                <EditableCell
                                                    initialValue={item.timeTo}
                                                    onSave={(v) => handleCellSave(`${item.id}-timeTo`, v)}
                                                    isOverridden={!!overrides[`${item.id}-timeTo`]}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <EditableCell
                                                initialValue={item.duration}
                                                onSave={(v) => handleCellSave(`${item.id}-duration`, v)}
                                                isOverridden={!!overrides[`${item.id}-duration`]}
                                            />
                                        </td>
                                        <td className="p-4 align-top font-bold">
                                            <EditableCell
                                                initialValue={item.event}
                                                onSave={(v) => handleCellSave(`${item.id}-event`, v)}
                                                isOverridden={!!overrides[`${item.id}-event`]}
                                            />
                                        </td>
                                        <td className="p-4 align-top">
                                            <EditableCell
                                                initialValue={item.host}
                                                onSave={(v) => handleCellSave(`${item.id}-host`, v)}
                                                isOverridden={!!overrides[`${item.id}-host`]}
                                            />
                                        </td>
                                        <td className="p-4 align-top text-sm">
                                            <EditableCell
                                                initialValue={item.remarks}
                                                onSave={(v) => handleCellSave(`${item.id}-remarks`, v)}
                                                isOverridden={!!overrides[`${item.id}-remarks`]}
                                            />
                                        </td>
                                        <td className="p-4 align-top text-center space-y-2">
                                            <div className="flex gap-1 justify-center mb-1">
                                                <button
                                                    onClick={() => handleMove(index, -1)}
                                                    disabled={index === 0}
                                                    className="w-1/2 text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1 bg-white dark:bg-zinc-800 rounded shadow-sm border border-gray-100 dark:border-gray-800"
                                                    title="Move up"
                                                >
                                                    ⬆️
                                                </button>
                                                <button
                                                    onClick={() => handleMove(index, 1)}
                                                    disabled={index === computedSchedule.length - 1}
                                                    className="w-1/2 text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1 bg-white dark:bg-zinc-800 rounded shadow-sm border border-gray-100 dark:border-gray-800"
                                                    title="Move down"
                                                >
                                                    ⬇️
                                                </button>
                                            </div>
                                            {item.isCustom && (
                                                <button
                                                    onClick={() => handleDeleteAct(item.id)}
                                                    className="block w-full text-red-500 hover:text-red-700 p-1 bg-white dark:bg-zinc-800 rounded shadow-sm border border-red-100 dark:border-red-900/30"
                                                    title="Delete custom item"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (insertingAfterId === item.id && duplicatingItemData) {
                                                        // If currently duplicating this item, close it
                                                        setInsertingAfterId(null);
                                                        setDuplicatingItemData(null);
                                                    } else {
                                                        setInsertingAfterId(item.id);
                                                        setDuplicatingItemData({
                                                            event: item.event,
                                                            host: item.host,
                                                            remarks: item.remarks,
                                                        });
                                                    }
                                                }}
                                                className="block w-full text-purple-500 hover:text-purple-700 p-1 bg-white dark:bg-zinc-800 rounded shadow-sm border border-purple-100 dark:border-purple-900/50"
                                                title="Duplicate this row"
                                            >
                                                📋
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (insertingAfterId === item.id && !duplicatingItemData) {
                                                        setInsertingAfterId(null);
                                                    } else {
                                                        setInsertingAfterId(item.id);
                                                        setDuplicatingItemData(null);
                                                    }
                                                }}
                                                className="block w-full text-blue-500 hover:text-blue-700 p-1 bg-white dark:bg-zinc-800 rounded shadow-sm border border-blue-100 dark:border-blue-900/50"
                                                title="Insert empty item after this row"
                                            >
                                                {insertingAfterId === item.id && !duplicatingItemData ? '➖' : '➕'}
                                            </button>
                                        </td>
                                    </tr>
                                    {insertingAfterId === item.id && (
                                        <tr>
                                            <td colSpan={6} className={`bg-gray-50 border-y-2 p-0 ${duplicatingItemData ? 'border-purple-200' : 'border-blue-200'}`}>
                                                <AddPerformance 
                                                    onAdd={(act) => handleAddAct(act, item.id)} 
                                                    initialData={duplicatingItemData || undefined}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <AddPerformance onAdd={handleAddAct} />
            </div>
        </div>
    );
}
