/**
 * Parse duration string to minutes
 * Examples: "1h" -> 60, "30min" -> 30, "1h 30min" -> 90, "2h" -> 120
 */
export function parseDurationToMinutes(duration: string | number | null | undefined): number {
    if (typeof duration === 'number') {
        return duration;
    }

    if (!duration || typeof duration !== 'string') {
        return 60; // Default to 1 hour
    }

    let totalMinutes = 0;

    // Match hours (e.g., "1h", "2h")
    const hoursMatch = duration.match(/(\d+)\s*h/);
    if (hoursMatch) {
        totalMinutes += parseInt(hoursMatch[1]) * 60;
    }

    // Match minutes (e.g., "30min", "45min")
    const minutesMatch = duration.match(/(\d+)\s*min/);
    if (minutesMatch) {
        totalMinutes += parseInt(minutesMatch[1]);
    }

    // If no matches found, default to 60 minutes
    return totalMinutes || 60;
}

/**
 * Format minutes to duration string
 * Examples: 60 -> "01 h 00 m", 90 -> "01 h 30 m", 120 -> "02 h 00 m"
 */
export function formatMinutesToDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')} h ${String(mins).padStart(2, '0')} m`;
}
