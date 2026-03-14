/**
 * Utility functions for handling and calculating times string formats like "7:45 AM" or "09:30".
 */

/**
 * Parses a time string (e.g. "7:45 AM" or "09:30") into total minutes from midnight.
 * Returns null if parsing fails.
 */
export function timeStringToMinutes(timeStr: string): number | null {
    if (!timeStr) return null;
    
    // Replace non-breaking spaces, trim, and handle missing AM/PM gracefully
    const cleanStr = timeStr.replace(/\u00A0/g, ' ').trim().toUpperCase();
    
    // Generic regex to parse H:MM AM/PM or HH:MM
    const match = cleanStr.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
    
    if (!match) return null;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3]; // AM or PM
    
    if (modifier === 'PM' && hours < 12) {
        hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }
    
    return (hours * 60) + minutes;
}

/**
 * Converts total minutes from midnight back into a formatted time string (e.g. "7:45 AM").
 */
export function minutesToTimeString(totalMinutes: number): string {
    // Handle negative minutes by wrapping around 24 hours
    const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    
    let hours = Math.floor(normalizedMinutes / 60);
    const minutes = Math.floor(normalizedMinutes % 60);
    
    const modifier = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    if (hours === 0) hours = 12;
    
    const minutesStr = minutes.toString().padStart(2, '0');
    
    return `${hours}:${minutesStr} ${modifier}`;
}

/**
 * Adds a given amount of minutes to a time string.
 * Returns the new formatted time string, or the original string if parsing failed.
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number | string): string {
    const startMinutes = timeStringToMinutes(timeStr);
    if (startMinutes === null) return timeStr;
    
    const toAdd = typeof minutesToAdd === 'string' ? parseInt(minutesToAdd, 10) : minutesToAdd;
    if (isNaN(toAdd)) return timeStr;
    
    return minutesToTimeString(startMinutes + toAdd);
}

/**
 * Calculates the difference in minutes between two time strings (end - start).
 * Returns null if parsing fails.
 */
export function getMinutesDifference(startStr: string, endStr: string): number | null {
    const startMins = timeStringToMinutes(startStr);
    const endMins = timeStringToMinutes(endStr);
    
    if (startMins === null || endMins === null) return null;
    
    let diff = endMins - startMins;
    
    // Handle overnight wrap-around (e.g. 11:50 PM to 12:10 AM)
    if (diff < -720) { // arbitrary threshold for overnight wrap
        diff += 1440;
    }
    
    return diff;
}
