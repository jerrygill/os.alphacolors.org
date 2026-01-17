export const getBadgeColor = (text: string): string => {
    const t = text.toLowerCase();
    if (t.includes('worship') || t.includes('song')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (t.includes('word') || t.includes('preach') || t.includes('message')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (t.includes('prayer')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (t.includes('communion')) return 'bg-red-100 text-red-700 border-red-200';
    if (t.includes('offering')) return 'bg-green-100 text-green-700 border-green-200';
    if (t.includes('announcement')) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (t.includes('welcome') || t.includes('arrival')) return 'bg-teal-100 text-teal-700 border-teal-200';
    // Default
    return 'bg-gray-50 text-gray-600 border-gray-200';
};

export const getHostBadgeColor = (text: string): string => {
    return 'bg-black text-white border-black';
};
