import { ScheduleItem } from '@/lib/types';
import { getBadgeColor, getHostBadgeColor } from '@/lib/badges';

interface ScheduleTableProps {
    schedule: ScheduleItem[];
}

export default function ScheduleTable({ schedule }: ScheduleTableProps) {
    if (!schedule || schedule.length === 0) {
        return (
            <div className="text-center p-12 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-gray-400 font-medium">No items scheduled.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-4">
            {schedule.map((item, index) => {
                // Logic to avoid duplicate content:
                // Only show category badge if the event name is significantly different from the badge keyword
                const badgeCategory = item.event.split(' ')[0];
                const showCategoryBadge = !item.event.toLowerCase().startsWith(badgeCategory.toLowerCase());

                return (
                    <div
                        key={item.id}
                        className={`group relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6 transition-all hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-sm ${item.isCustom ? 'border-dashed border-blue-200 bg-blue-50/10' : ''
                            }`}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

                            {/* LEFT: Time Column (Desktop: Col 1-3) */}
                            <div className="md:col-span-3 flex md:flex-col items-baseline md:items-start gap-3 md:gap-1">
                                <span className="font-bold text-2xl md:text-3xl tracking-tight text-gray-900 dark:text-white font-sans">
                                    {item.timeFrom}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
                                        {item.timeTo && `- ${item.timeTo}`}
                                    </span>
                                    {item.duration && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                                            {item.duration}m
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT: Content Column (Desktop: Col 4-12) */}
                            <div className="md:col-span-9 w-full">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight whitespace-pre-wrap">
                                        {item.event}
                                    </h3>

                                    {/* Host Badge - Moved to right on desktop */}
                                    {item.host && (
                                        <span className={`self-start md:self-auto text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${getHostBadgeColor(item.host)}`}>
                                            {item.host}
                                        </span>
                                    )}
                                </div>

                                {/* Remarks */}
                                {item.remarks && (
                                    <div className="mt-2 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-700/50">
                                        <p className="text-sm md:text-base font-medium text-gray-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                            {item.remarks}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
