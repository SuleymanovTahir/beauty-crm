
const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0); // Invalid
    // Try ISO format first
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    // Try custom format like DD.MM.YYYY, HH:mm:ss if prevalent
    // Assumption: "28.12.2025, 14:00:00"
    const parts = dateStr ? dateStr.split(',')[0].split('.') : [];
    if (parts.length === 3) {
        // DD.MM.YYYY -> YYYY-MM-DD
        const timePart = dateStr.split(',')[1]?.trim() || '00:00:00';
        const iso = `${parts[2]}-${parts[1]}-${parts[0]}T${timePart}`;
        console.log(`Manual ISO construction: ${iso}`);
        d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
    }
    return new Date(0); // Fallback
};

const isSameDay = (d1, d2) => {
    console.log(`Comparing ${d1.toISOString()} with ${d2.toISOString()}`);
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
};

const now = new Date(); // 2026-01-09...
const dateStr = "28.12.2025, 14:00:00";
const parsed = parseDate(dateStr);
console.log(`Parsed date: ${parsed.toString()}`);

const same = isSameDay(parsed, now);
console.log(`Is same day? ${same}`);
