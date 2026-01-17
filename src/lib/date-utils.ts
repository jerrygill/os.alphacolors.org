import { startOfMonth, isSameDay, getDay, addDays } from 'date-fns';

/**
 * Checks if the given date is the first Sunday of the month.
 * @param date optional date to check, defaults to today
 * @returns true if it is the first Sunday
 */
export function isFirstSunday(date: Date = new Date()): boolean {
    const dayOfWeek = getDay(date);

    // 0 is Sunday
    if (dayOfWeek !== 0) {
        return false;
    }

    // Get the first day of the month
    const firstDayOfMonth = startOfMonth(date);

    // Find the first Sunday of the month
    let firstSunday = firstDayOfMonth;
    while (getDay(firstSunday) !== 0) {
        firstSunday = addDays(firstSunday, 1);
    }

    // Check if the given date is the same day as the first Sunday
    return isSameDay(date, firstSunday);
}

/**
 * Gets the GID for the appropriate sheet based on the date.
 * @param date optional date to check
 * @returns string GID for Standard or Communion sheet
 */
export function getSheetGid(date: Date = new Date()): string {
    const standardGid = process.env.NEXT_PUBLIC_STANDARD_GID || '1798405832';
    const communionGid = process.env.NEXT_PUBLIC_COMMUNION_GID || '114318838';

    return isFirstSunday(date) ? communionGid : standardGid;
}

/**
 * Generate a unique key for the current week (ISO week)
 * Used for persisting local overrides per service.
 * Format: YYYY-Www (e.g., 2026-W03)
 */
export function getWeekKey(date: Date = new Date()): string {
    // Simple week key generation
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const year = d.getUTCFullYear();
    const weekNo = Math.ceil((((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
    return `${year}-W${String(weekNo).padStart(2, '0')}`;
}
