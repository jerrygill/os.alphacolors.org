import { ServiceData, ScheduleItem } from './types';

// Helper to parse CSV data
const parseCSV = (csvText: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\n' || char === '\r') {
                currentRow.push(currentCell.trim());
                currentCell = '';
                if (currentRow.length > 0 && currentRow.some(c => c)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                if (char === '\r' && nextChar === '\n') i++;
            } else {
                currentCell += char;
            }
        }
    }
    if (currentRow.length > 0 || currentCell) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    return rows;
};

export async function fetchSheetData(gid: string): Promise<ServiceData> {
    const sheetId = process.env.NEXT_PUBLIC_SHEET_ID;
    if (!sheetId) throw new Error('Sheet ID not configured');

    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    try {
        const response = await fetch(url, { next: { revalidate: 300 } }); // Cache for 5 mins
        if (!response.ok) throw new Error('Failed to fetch sheet data');

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        return parseServiceData(rows);
    } catch (error) {
        console.error('Error fetching sheet:', error);
        // Return empty fallback
        return {
            title: 'Error Loading Data',
            date: new Date().toLocaleDateString(),
            host: '',
            team: {},
            schedule: [],
            raw: []
        };
    }
}

function parseServiceData(rows: string[][]): ServiceData {
    const data: ServiceData = {
        title: 'ORDER OF SERVICE',
        date: '',
        host: '',
        team: {},
        schedule: [],
        raw: rows
    };

    let scheduleStartIndex = -1;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        // Header Info
        // Looking for "DATE:" value in typically col B
        // We search across the row for the label
        const dateIdx = row.findIndex(c => c && c.toUpperCase().includes('DATE:'));
        if (dateIdx !== -1 && row[dateIdx + 1]) {
            data.date = row[dateIdx + 1].trim();
        }

        const hostIdx = row.findIndex(c => c && c.includes('Service Host:'));
        if (hostIdx !== -1 && row[hostIdx + 1]) {
            data.host = row[hostIdx + 1].trim();
        }

        // Team Info parsing
        const roles = ['Sound/Lights', 'Media/Stream', 'Ushers', 'Offering Counter', 'ACC Kids', 'Juniors'];

        row.forEach((cell, idx) => {
            if (!cell) return;
            const cleanCell = cell.replace(':', '').trim();

            if (roles.includes(cleanCell)) {
                let name = row[idx + 1] || '';
                const nextCell = row[idx + 2]; // Potential secondary name
                // Only append if next cell is a valid string, not another role, and not empty
                if (nextCell && !roles.includes(nextCell.replace(':', '').trim()) && !nextCell.includes(':')) {
                    name += ` / ${nextCell}`;
                }
                data.team[cleanCell] = name;
            }
        });

        // Find Schedule Start
        // The main header row has "TIME" and "EVENT"
        // In this specific sheet, this is usually 2 rows before the actual data
        if (row.some(c => c.includes('TIME')) && row.some(c => c.includes('EVENT'))) {
            scheduleStartIndex = i + 2; // Skip TIME row and FROM/TO row
        }
    }

    // Parse Schedule
    if (scheduleStartIndex > -1) {
        for (let i = scheduleStartIndex; i < rows.length; i++) {
            const row = rows[i];

            // Stop if row is completely empty or just ends
            if (!row || row.every(c => !c)) continue;

            // Columns based on CSV:
            // A (0): FROM
            // B (1): TO
            // C (2): DURATION
            // D (3): EVENT
            // E (4): HOST
            // F (5): REMARKS

            const timeFrom = row[0]?.trim();
            const timeTo = row[1]?.trim();
            const duration = row[2]?.trim();
            const event = row[3]?.trim();
            const host = row[4]?.trim();
            const remarks = row[5]?.trim();

            // Skip rows that are empty in critical fields or look like headers
            if (!timeFrom && !event) continue;
            if (timeFrom === 'FROM') continue;

            data.schedule.push({
                id: `row-${i}`,
                timeFrom: timeFrom || '',
                timeTo: timeTo || '',
                duration: duration || '',
                event: event || '',
                host: host || '',
                remarks: remarks || ''
            });
        }
    }

    return data;
}
