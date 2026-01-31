import { startOfMonth, isSameDay, getDay, addDays, nextSunday } from 'date-fns';

/**
 * Gets the date of the next upcoming Sunday.
 * If today is Sunday, returns today's date.
 * Otherwise, returns the next Sunday.
 */
export function getUpcomingSunday(date: Date = new Date()): Date {
    const dayOfWeek = getDay(date);

    // If today is Sunday (0), return today
    if (dayOfWeek === 0) {
        return date;
    }

    // Otherwise, get the next Sunday
    return nextSunday(date);
}

/**
 * Checks if the upcoming Sunday is the first Sunday of its month.
 * @param date optional date to check, defaults to today
 * @returns true if the upcoming Sunday is the first Sunday of the month
 */
export function isFirstSunday(date: Date = new Date()): boolean {
    const upcomingSunday = getUpcomingSunday(date);

    // Get the first day of the month for the upcoming Sunday
    const firstDayOfMonth = startOfMonth(upcomingSunday);

    // Find the first Sunday of that month
    let firstSunday = firstDayOfMonth;
    while (getDay(firstSunday) !== 0) {
        firstSunday = addDays(firstSunday, 1);
    }

    // Check if the upcoming Sunday is the same day as the first Sunday
    return isSameDay(upcomingSunday, firstSunday);
}

/**
 * Gets the GID for the appropriate sheet based on the upcoming Sunday.
 * @param date optional date to check
 * @returns string GID for Standard or Communion sheet
 */
export function getSheetGid(date: Date = new Date()): string {
    const standardGid = process.env.NEXT_PUBLIC_STANDARD_GID || '1798405832';
    const communionGid = process.env.NEXT_PUBLIC_COMMUNION_GID || '114318838';

    return isFirstSunday(date) ? communionGid : standardGid;
}

/**
 * Generate a unique key for the upcoming Sunday's week (ISO week)
 * Used for persisting local overrides per service.
 * Format: YYYY-Www (e.g., 2026-W05)
 */
export function getWeekKey(date: Date = new Date()): string {
    const upcomingSunday = getUpcomingSunday(date);

    const d = new Date(Date.UTC(upcomingSunday.getFullYear(), upcomingSunday.getMonth(), upcomingSunday.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const year = d.getUTCFullYear();
    const weekNo = Math.ceil((((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
    return `${year}-W${String(weekNo).padStart(2, '0')}`;
}
