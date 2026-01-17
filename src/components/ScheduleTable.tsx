import { ScheduleItem } from '@/lib/types';

interface ScheduleTableProps {
    schedule: ScheduleItem[];
}

export default function ScheduleTable({ schedule }: ScheduleTableProps) {
    if (!schedule || schedule.length === 0) {
        return (
            <div className="text-center p-10 bg-apple-gray-50 rounded-2xl">
                <p className="text-gray-500">No schedule items found.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto overflow-hidden rounded-2xl shadow-sm border border-apple-gray-200 dark:border-none bg-white dark:bg-apple-gray-800">
            {/* Mobile View (Cards) */}
            <div className="md:hidden">
                {schedule.map((item, index) => (
                    <div
                        key={item.id}
                        className={`p-5 border-b border-apple-gray-100 dark:border-gray-700 last:border-none ${item.isCustom ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-lg text-gray-900 dark:text-white">{item.timeFrom} - {item.timeTo}</span>
                                {item.duration && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-apple-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                                        {item.duration}m
                                    </span>
                                )}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{item.event}</h3>

                        {item.host && (
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                                <span className="text-gray-400 mr-2">Host:</span> {item.host}
                            </p>
                        )}

                        {item.remarks && (
                            <div className="mt-3 p-3 bg-apple-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {item.remarks}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-apple-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-sm font-semibold uppercase tracking-wider">
                            <th className="p-4 w-32 border-b border-gray-200 dark:border-gray-600">Time</th>
                            <th className="p-4 w-20 border-b border-gray-200 dark:border-gray-600 text-center">Dur</th>
                            <th className="p-4 w-1/4 border-b border-gray-200 dark:border-gray-600">Event</th>
                            <th className="p-4 w-1/5 border-b border-gray-200 dark:border-gray-600">Host</th>
                            <th className="p-4 border-b border-gray-200 dark:border-gray-600">Remarks</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {schedule.map((item) => (
                            <tr
                                key={item.id}
                                className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${item.isCustom ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                    }`}
                            >
                                <td className="p-4 align-top font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">
                                    <div className="flex flex-col">
                                        <span>{item.timeFrom}</span>
                                        <span className="text-gray-400 text-xs">{item.timeTo}</span>
                                    </div>
                                </td>
                                <td className="p-4 align-top text-center text-gray-500 dark:text-gray-400 font-medium">
                                    {item.duration}
                                </td>
                                <td className="p-4 align-top font-bold text-gray-900 dark:text-white text-lg">
                                    {item.event}
                                </td>
                                <td className="p-4 align-top text-gray-700 dark:text-gray-300 font-medium">
                                    {item.host}
                                </td>
                                <td className="p-4 align-top text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                    {item.remarks}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
