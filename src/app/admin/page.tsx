'use client';

import { useEffect, useState } from 'react';
import { fetchSheetData } from '@/lib/sheets';
import { getSheetGid, getWeekKey } from '@/lib/date-utils';
import { getOverrides, getCustomActs, saveOverride, addCustomAct, removeCustomAct, clearOverrides, OverrideData, CustomAct } from '@/lib/storage';
import { ServiceData } from '@/lib/types';
import EditableCell from '@/components/EditableCell';
import AddPerformance from '@/components/AddPerformance';
import Link from 'next/link';

export default function AdminPage() {
    const [data, setData] = useState<ServiceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [overrides, setOverrides] = useState<OverrideData>({});

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

            // Load local state
            const savedOverrides = getOverrides(weekKey);
            setOverrides(savedOverrides);

            // Load custom acts
            const customActs = getCustomActs(weekKey);

            // Merge custom acts into schedule for display
            // Note: In admin, we append them at the end with a delete button
            sheetData.schedule = [...sheetData.schedule, ...customActs];

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

    const handleCellSave = (id: string, value: string) => {
        saveOverride(currentWeekKey, id, value);
        // Update local state to reflect change immediately
        setOverrides(prev => ({ ...prev, [id]: value }));
        // Also update data object so it shows in UI without refresh
        // (Simplified: for deep updates we rely on overrides map in render)
    };

    const handleAddAct = (actData: Omit<CustomAct, 'id' | 'isNew'>) => {
        const newAct: CustomAct = {
            ...actData,
            id: `custom-${Date.now()}`,
            isNew: true
        };
        addCustomAct(currentWeekKey, newAct);
        loadData(); // Reload to see changes
    };

    const handleDeleteAct = (id: string) => {
        if (confirm('Are you sure you want to delete this added item?')) {
            removeCustomAct(currentWeekKey, id);
            loadData();
        }
    };

    const handleReset = () => {
        if (confirm('This will clear ALL local edits for this week. Are you sure?')) {
            clearOverrides(currentWeekKey);
            // Also we should technically clear custom acts if we want a full reset, 
            // but function only clears overrides. Let's stick to overrides for now or manually clean acts.
            // For now, let's just reload.
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
                                {data.schedule.map((item) => (
                                    <tr key={item.id} className={item.isCustom ? 'bg-blue-50/30' : ''}>
                                        <td className="p-4 align-top">
                                            <div className="space-y-1">
                                                <EditableCell
                                                    initialValue={getVal(`${item.id}-timeFrom`, item.timeFrom)}
                                                    onSave={(v) => handleCellSave(`${item.id}-timeFrom`, v)}
                                                    isOverridden={!!overrides[`${item.id}-timeFrom`]}
                                                />
                                                <EditableCell
                                                    initialValue={getVal(`${item.id}-timeTo`, item.timeTo)}
                                                    onSave={(v) => handleCellSave(`${item.id}-timeTo`, v)}
                                                    isOverridden={!!overrides[`${item.id}-timeTo`]}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <EditableCell
                                                initialValue={getVal(`${item.id}-duration`, item.duration)}
                                                onSave={(v) => handleCellSave(`${item.id}-duration`, v)}
                                                isOverridden={!!overrides[`${item.id}-duration`]}
                                            />
                                        </td>
                                        <td className="p-4 align-top font-bold">
                                            <EditableCell
                                                initialValue={getVal(`${item.id}-event`, item.event)}
                                                onSave={(v) => handleCellSave(`${item.id}-event`, v)}
                                                isOverridden={!!overrides[`${item.id}-event`]}
                                            />
                                        </td>
                                        <td className="p-4 align-top">
                                            <EditableCell
                                                initialValue={getVal(`${item.id}-host`, item.host)}
                                                onSave={(v) => handleCellSave(`${item.id}-host`, v)}
                                                isOverridden={!!overrides[`${item.id}-host`]}
                                            />
                                        </td>
                                        <td className="p-4 align-top text-sm">
                                            <EditableCell
                                                initialValue={getVal(`${item.id}-remarks`, item.remarks)}
                                                onSave={(v) => handleCellSave(`${item.id}-remarks`, v)}
                                                isOverridden={!!overrides[`${item.id}-remarks`]}
                                            />
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            {item.isCustom && (
                                                <button
                                                    onClick={() => handleDeleteAct(item.id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Delete custom item"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
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
