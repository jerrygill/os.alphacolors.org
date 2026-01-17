import { useRef, useEffect } from 'react';
import { ServiceData } from '@/lib/types';
import { format } from 'date-fns';

interface ServiceHeaderProps {
    data: ServiceData;
}

export default function ServiceHeader({ data }: ServiceHeaderProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.classList.add('animate-fade-in');
        }
    }, []);

    return (
        <div ref={containerRef} className="w-full max-w-4xl mx-auto mb-8 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight mb-2 text-foreground font-sans">
                    {data.title}
                </h1>
                <p className="text-xl text-gray-500 font-medium">{data.date}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Left Column: Date and Host */}
                <div className="bg-apple-gray-50 dark:bg-apple-gray-800 rounded-2xl p-6 shadow-sm border border-apple-gray-100 dark:border-none">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                            <span className="font-semibold text-gray-500 dark:text-gray-400">DATE</span>
                            <span className="font-bold text-lg">{data.date}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                            <span className="font-semibold text-gray-500 dark:text-gray-400">Service Host</span>
                            <span className="font-bold text-lg">{data.host}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Roles */}
                <div className="bg-apple-gray-50 dark:bg-apple-gray-800 rounded-2xl p-6 shadow-sm border border-apple-gray-100 dark:border-none">
                    <div className="space-y-3">
                        {Object.entries(data.team).map(([role, name]) => (
                            <div key={role} className="flex justify-between items-start text-sm md:text-base border-b last:border-0 border-gray-200 dark:border-gray-700 pb-2 last:pb-0">
                                <span className="font-semibold text-gray-500 dark:text-gray-400 min-w-[120px]">{role}</span>
                                <span className="font-medium text-right text-gray-900 dark:text-gray-100">{name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
