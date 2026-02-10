import { BusinessTrip, TeamMember } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Normalizes date strings to ISO format (YYYY-MM-DD).
 * Handles: "MM-DD", "YYYY.MM.DD", "YYYY-MM-DD"
 * Assumes current year if year is missing.
 */
function normalizeDate(dateStr: string, baseDate: Date = new Date()): string {
    const cleanStr = dateStr.trim();
    const currentYear = baseDate.getFullYear();

    // MM-DD
    const mmddMatch = /^\d{1,2}[-.]\d{1,2}$/.test(cleanStr);
    if (mmddMatch) {
        let [month, day] = cleanStr.includes('-') ? cleanStr.split('-') : cleanStr.split('.');
        const m = parseInt(month, 10);
        const d = parseInt(day, 10);

        // Handle year boundary (e.g. 12-31 to 01-01)
        // If current month is Dec and parsed month is Jan, add 1 to year.
        // If current month is Jan and parsed month is Dec, subtract 1 from year.
        let year = currentYear;
        // Simple heuristic: if month difference > 6, assume year boundary crossing
        if (baseDate.getMonth() + 1 === 12 && m === 1) year++;
        else if (baseDate.getMonth() + 1 === 1 && m === 12) year--;

        const date = new Date(year, m - 1, d);
        // Date adjustment for valid ISO
        return date.toISOString().split('T')[0];
    }

    // YYYY-MM-DD
    return cleanStr;
}

/**
 * Parses business trip data from clipboard text.
 * Looks for patterns:
 * 1. Detailed blocks: "MM-DD ~ MM-DD\nName\nPurpose\n..."
 * 2. Daily summary lines: "Name / Purpose" (only if duration not found)
 */
export function parseTripText(text: string, existingMembers: TeamMember[]): { trips: BusinessTrip[], unknownNames: string[] } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const trips: BusinessTrip[] = [];
    const unknownNames: Set<string> = new Set();
    const now = new Date().toISOString();

    // Member lookup map: Name -> TeamMember[]
    // Handles duplicates by storing array of matches
    const memberMap = new Map<string, TeamMember[]>();
    for (const m of existingMembers) {
        const key = m.name.trim(); // Normalize name
        if (!memberMap.has(key)) {
            memberMap.set(key, []);
        }
        memberMap.get(key)!.push(m);
    }

    // Identify "Detailed Blocks" based on date range pattern: MM-DD ~ MM-DD
    // Example: "01-14 ~ 02-11" followed by Name
    // We scan line by line.
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Pattern: Date Range "MM-DD ~ MM-DD"
        const rangeMatch = line.match(/^(\d{2}-\d{2})\s*~\s*(\d{2}-\d{2})$/);
        if (rangeMatch) {
            // Found a date range line.
            // Look ahead for Name and Purpose.
            // The format from user:
            // Line i: 01-14 ~ 02-11
            // Line i+1: 강병훈
            // Line i+2: 해외출장(생산법인)
            // Line i+3: 종일 (optional)

            if (i + 2 < lines.length) {
                const startDateStr = rangeMatch[1];
                const endDateStr = rangeMatch[2];
                const name = lines[i + 1].trim();
                const purpose = lines[i + 2].trim();

                // Validate if next line looks like a name (not a date or "종일")
                const isName = !/^\d/.test(name) && name !== '종일' && name !== '반일';

                if (isName) {
                    // Start/End Dates
                    const startDate = normalizeDate(startDateStr);
                    const endDate = normalizeDate(endDateStr);

                    // Match KnoxID
                    let knoxId: string | undefined;
                    const candidates = memberMap.get(name);

                    if (candidates) {
                        if (candidates.length === 1) {
                            knoxId = candidates[0].knoxId;
                        } else {
                            // Ambiguous name - treat as unknown for now, user needs to resolve
                            // Or leave knoxId undefined and UI will show warning
                            knoxId = undefined; // Ambiguous
                        }
                    } else {
                        unknownNames.add(name);
                    }

                    trips.push({
                        id: uuidv4(),
                        knoxId,
                        name,
                        startDate,
                        endDate,
                        location: '해외', // Default to generic, can refine if needed
                        purpose,
                        status: 'planned', // Default
                        createdAt: now,
                        updatedAt: now
                    });

                    // Skip the consumed lines
                    i += 2;
                    continue;
                }
            }
        }
    }

    // Deduplicate trips: same name + same start/end
    const uniqueTrips: BusinessTrip[] = [];
    const seen = new Set<string>();

    for (const trip of trips) {
        const key = `${trip.name}|${trip.startDate}|${trip.endDate}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueTrips.push(trip);
        }
    }

    return { trips: uniqueTrips, unknownNames: Array.from(unknownNames) };
}
