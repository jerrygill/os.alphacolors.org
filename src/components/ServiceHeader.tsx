import { useRef, useEffect } from 'react';
import { ServiceData } from '@/lib/types';
import Image from 'next/image';

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
        <div ref={containerRef} className="w-full max-w-6xl mx-auto mb-12 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>

            {/* Global Brand Logo - Large and Centered */}
            <div className="flex justify-center mb-6 md:mb-10 pt-4 md:pt-0">
                <div className="relative w-56 h-16 md:w-80 md:h-28">
                    <Image
                        src="/ALPHACOLORS_logo-black.png"
                        alt="Alpha Colors Logo"
                        fill
                        className="object-contain dark:hidden"
                        priority
                    />
                    <Image
                        src="/ALPHACOLORS_logo-white.png"
                        alt="Alpha Colors Logo"
                        fill
                        className="object-contain hidden dark:block"
                        priority
                    />
                </div>
            </div>

            {/* Hero Info Cards - No outer container */}
            <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    {/* Title Card (Spans 2 cols on desktop) */}
                    <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 md:p-8 rounded-3xl flex flex-col justify-center items-start shadow-sm min-h-[120px] md:min-h-[160px]">
                        <span className="inline-block px-3 py-1 mb-2 text-[10px] font-bold tracking-widest text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/30 rounded-full">
                            Order of Service
                        </span>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-gray-900 dark:text-white leading-none font-sans">
                            {data.date}
                        </h1>
                    </div>

                    {/* Host Card */}
                    <div className="bg-black dark:bg-zinc-800 text-white p-6 md:p-8 rounded-3xl flex flex-col justify-center items-start shadow-xl min-h-[120px] md:min-h-[160px]">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Service Host</span>
                        <span className="text-xl md:text-3xl font-bold leading-tight">
                            {data.host || 'TBD'}
                        </span>
                    </div>
                </div>

                {/* Team Grid */}
                {/* 1 col mobile, 2 col tablet, 3 col desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(data.team).map(([role, name]) => (
                        <div key={role} className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-2xl border border-gray-100 dark:border-zinc-800 flex flex-row justify-between items-center transition-all hover:border-gray-200 dark:hover:border-zinc-700 min-h-[70px]">
                            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                {role}
                            </span>
                            <span className="text-sm md:text-base font-bold text-gray-900 dark:text-white text-right pl-4 truncate">
                                {name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
