import { BusinessTrip, TeamMember, TripCategory } from './types';

/**
 * Auto-classify attendance purpose text into app trip categories.
 */
function classifyPurpose(purpose: string): TripCategory {
    const p = purpose.trim();

    // Vacation keywords (high priority)
    if (/연차|휴가/.test(p)) return 'vacation';

    // Education keywords
    if (/교육/.test(p)) return 'education';

    // Others keywords
    // NOTE: "해외출장" contains "외출" as a substring, so avoid plain /외출/ matching.
    if (/협력사방문외출|외근|검진|기타결근|자기계발/.test(p)) return 'others';

    // Default: business trip
    return 'trip';
}

/**
 * Normalizes/repairs category using purpose text.
 * Used for previously stored data that may have wrong category values.
 */
export function normalizeTripCategory(purpose: string, currentCategory?: TripCategory): TripCategory {
    const fromPurpose = classifyPurpose(purpose);
    if (currentCategory === 'vacation' || currentCategory === 'education' || currentCategory === 'others') {
        // Keep explicit non-trip categories only when purpose agrees.
        if (fromPurpose === currentCategory) return currentCategory;
    }
    // Prefer purpose-derived category to fix legacy misclassification.
    return fromPurpose || currentCategory || 'trip';
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
    if (/^\d{1,2}[-.]\d{1,2}$/.test(cleanStr)) {
        const [month, day] = cleanStr.includes('-') ? cleanStr.split('-') : cleanStr.split('.');
        const m = parseInt(month, 10);
        const d = parseInt(day, 10);
        return `${currentYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    return cleanStr;
}

/**
 * Normalizes a date range, handling year-boundary crossings.
 * Example: "12-29 ~ 02-12" with baseDate 2026-02-11
 * -> startDate = 2025-12-29, endDate = 2026-02-12
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
        if (start.month > end.month) startYear = currentYear - 1;

        return {
            startDate: `${startYear}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`,
            endDate: `${endYear}-${String(end.month).padStart(2, '0')}-${String(end.day).padStart(2, '0')}`,
        };
    }

    return {
        startDate: normalizeDate(startStr, baseDate),
        endDate: normalizeDate(endStr, baseDate),
    };
}

/**
 * Parses attendance text from clipboard.
 * Supports:
 * 1) Range blocks: "MM-DD ~ MM-DD\\n이름\\n목적"
 * 2) Single-day blocks: "MM-DD\\n이름\\n목적"
 */
export function parseTripText(text: string, existingMembers: TeamMember[]): { trips: BusinessTrip[]; unknownNames: string[] } {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const trips: BusinessTrip[] = [];
    const unknownNames = new Set<string>();
    const now = new Date().toISOString();

    // Member lookup map: Name -> TeamMember[]
    const memberMap = new Map<string, TeamMember[]>();
    for (const m of existingMembers) {
        const key = m.name.trim();
        if (!memberMap.has(key)) memberMap.set(key, []);
        memberMap.get(key)!.push(m);
    }

    const isValidName = (name: string): boolean => {
        if (!name) return false;
        if (/^\d/.test(name)) return false;
        if (name === '종일' || name === '반일') return false;
        if (name.includes('근태')) return false;
        return true;
    };

    const isHeaderOrInvalidPurpose = (purpose: string): boolean => {
        return /^(종일|반일|반일\(오전\)|반일\(오후\)|시간 근태|All)$/i.test(purpose);
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1) Range block: MM-DD ~ MM-DD, then name, purpose
        const rangeMatch = line.match(/^(\d{2}-\d{2})\s*~\s*(\d{2}-\d{2})$/);
        if (rangeMatch && i + 2 < lines.length) {
            const startDateStr = rangeMatch[1];
            const endDateStr = rangeMatch[2];
            const name = lines[i + 1];
            const purpose = lines[i + 2];

            if (!isValidName(name) || isHeaderOrInvalidPurpose(purpose)) continue;

            const { startDate, endDate } = normalizeDateRange(startDateStr, endDateStr);

            let knoxId: string | undefined;
            const candidates = memberMap.get(name);
            if (candidates?.length === 1) {
                knoxId = candidates[0].knoxId;
            } else if (!candidates) {
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
                category: normalizeTripCategory(purpose),
                status: 'planned',
                createdAt: now,
                updatedAt: now,
            });

            i += 2;
            continue;
        }

        // 2) Single-day block: MM-DD, then name, purpose
        const singleDateMatch = line.match(/^(\d{2}-\d{2})$/);
        if (singleDateMatch && i + 2 < lines.length) {
            const dateStr = singleDateMatch[1];
            const name = lines[i + 1];
            const purpose = lines[i + 2];

            if (!isValidName(name) || isHeaderOrInvalidPurpose(purpose)) continue;

            const date = normalizeDate(dateStr);

            let knoxId: string | undefined;
            const candidates = memberMap.get(name);
            if (candidates?.length === 1) {
                knoxId = candidates[0].knoxId;
            } else if (!candidates) {
                unknownNames.add(name);
            }

            trips.push({
                id: crypto.randomUUID(),
                knoxId,
                name,
                startDate: date,
                endDate: date,
                location: '해외',
                purpose,
                category: normalizeTripCategory(purpose),
                status: 'planned',
                createdAt: now,
                updatedAt: now,
            });

            i += 2;
        }
    }

    // Deduplicate trips: same name + same start/end + purpose
    const uniqueTrips: BusinessTrip[] = [];
    const seen = new Set<string>();
    for (const trip of trips) {
        const key = `${trip.name}|${trip.startDate}|${trip.endDate}|${trip.purpose}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueTrips.push(trip);
    }

    return { trips: uniqueTrips, unknownNames: Array.from(unknownNames) };
}
