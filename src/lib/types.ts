export interface ServiceData {
    title: string;
    date: string;
    host: string;
    team: Record<string, string>;
    schedule: ScheduleItem[];
    raw?: any[][]; // For admin purposes
}

export interface ScheduleItem {
    id: string; // generated ID for React keys
    timeFrom: string;
    timeTo: string;
    duration: string;
    event: string;
    host: string;
    remarks: string;
    isCustom?: boolean; // For locally added items
}

export interface TeamMember {
    role: string;
    name: string;
    secondary?: string;
}
