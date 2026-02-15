import { BusinessTrip, TeamMember, TripCategory } from './types';

/**
 * Auto-classify trip category based on purpose text.
 * - education: 사외교육참석, 교육
 * - vacation: 연차, 시간연차, 장기근속휴가, 힐링휴가
 * - trip: everything else
 */
function classifyPurpose(purpose: string): TripCategory {
    const p = purpose.trim();

    // Vacation keywords (High priority)
    // "연차", "휴가" included -> Vacation
    if (/연차|휴가/.test(p)) {
        return 'vacation';
    }

    // Education keywords
    if (/교육/.test(p)) {
        return 'education';
    }

    // Others keywords
    if (/협력사|검진/.test(p)) {
        return 'others';
    }

    // Default: business trip
    return 'trip';
}

/**
 * Normalizes date strings to ISO format (YYYY-MM-DD).
 * Handles: "MM-DD", "YYYY.MM.DD", "YYYY-MM-DD"
 * Assumes current year if year is missing.
 */
export function normalizeDate(dateStr: string, baseDate: Date = new Date()): string {
    const cleanStr = dateStr.trim();
    const currentYear = baseDate.getFullYear();

    // MM-DD
    const mmddMatch = /^\d{1,2}[-.]\d{1,2}$/.test(cleanStr);
    if (mmddMatch) {
        const [month, day] = cleanStr.includes('-') ? cleanStr.split('-') : cleanStr.split('.');
        const m = parseInt(month, 10);
        const d = parseInt(day, 10);

        const date = new Date(currentYear, m - 1, d);
        return date.toISOString().split('T')[0];
    }

    // YYYY-MM-DD
    return cleanStr;
}

/**
 * Normalizes a date range, handling year-boundary crossings.
 * Example: "12-29 ~ 02-12" with baseDate 2026-02-11
 * → startDate = 2025-12-29, endDate = 2026-02-12
 * Logic: If startMonth > endMonth, startDate is in the previous year.
 */
function normalizeDateRange(startStr: string, endStr: string, baseDate: Date = new Date()): { startDate: string; endDate: string } {
    const currentYear = baseDate.getFullYear();

    const parseMonthDay = (s: string) => {
        const clean = s.trim();
        const parts = clean.includes('-') ? clean.split('-') : clean.split('.');
        return { month: parseInt(parts[0], 10), day: parseInt(parts[1], 10) };
    };

    const isShortDate = (s: string) => /^\d{1,2}[-.]\d{1,2}$/.test(s.trim());

    if (isShortDate(startStr) && isShortDate(endStr)) {
        const start = parseMonthDay(startStr);
        const end = parseMonthDay(endStr);

        let startYear = currentYear;
        const endYear = currentYear;

        // Year boundary: start month > end month (e.g., 12-29 ~ 02-12)
        if (start.month > end.month) {
            startYear = currentYear - 1;
        }

        const startDate = new Date(startYear, start.month - 1, start.day);
        const endDate = new Date(endYear, end.month - 1, end.day);

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        };
    }

    // Fallback: normalize individually
    return {
        startDate: normalizeDate(startStr, baseDate),
        endDate: normalizeDate(endStr, baseDate),
    };
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
        const key = m.name.trim();
        if (!memberMap.has(key)) {
            memberMap.set(key, []);
        }
        memberMap.get(key)!.push(m);
    }

    // Identify "Detailed Blocks" based on date range pattern: MM-DD ~ MM-DD
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Pattern: Date Range "MM-DD ~ MM-DD"
        const rangeMatch = line.match(/^(\d{2}-\d{2})\s*~\s*(\d{2}-\d{2})$/);
        if (rangeMatch) {
            if (i + 2 < lines.length) {
                const startDateStr = rangeMatch[1];
                const endDateStr = rangeMatch[2];
                const name = lines[i + 1].trim();
                const purpose = lines[i + 2].trim();

                // Validate if next line looks like a name (not a date or "종일")
                const isName = !/^\d/.test(name) && name !== '종일' && name !== '반일';

                if (isName) {
                    // Use normalizeDateRange for year-boundary handling
                    const { startDate, endDate } = normalizeDateRange(startDateStr, endDateStr);

                    // Match KnoxID
                    let knoxId: string | undefined;
                    const candidates = memberMap.get(name);

                    if (candidates) {
                        if (candidates.length === 1) {
                            knoxId = candidates[0].knoxId;
                        } else {
                            knoxId = undefined; // Ambiguous
                        }
                    } else {
                        unknownNames.add(name);
                    }

                    trips.push({
                        id: crypto.randomUUID(),
                        knoxId,
                        name,
                        startDate,
                        endDate,
                        location: '해외',
                        purpose,
                        category: classifyPurpose(purpose),
                        status: 'planned',
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
