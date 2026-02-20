import { Category, Task } from '@/lib/types';

export const TEAM_SCHEDULE_CATEGORY_NAME = '팀 일정';

export function resolveTeamScheduleCategoryId(categories: Category[], tasks: Task[]): string {
  const byExactName = categories.find(c => c.name === TEAM_SCHEDULE_CATEGORY_NAME);
  if (byExactName) return byExactName.id;

  // Fallback 1: Imported schedule marker
  const sourceCounts = new Map<string, number>();
  tasks.forEach(t => {
    if (t.source === 'team') {
      sourceCounts.set(t.categoryId, (sourceCounts.get(t.categoryId) || 0) + 1);
    }
  });
  if (sourceCounts.size > 0) {
    const top = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (top) return top[0];
  }

  // Fallback 2: Legacy imported schedules usually keep organizer/highlightLevel metadata
  const legacyCounts = new Map<string, number>();
  tasks.forEach(t => {
    const hasOrganizer = typeof t.organizer === 'string' && t.organizer.trim() !== '';
    const hasHighlight = typeof t.highlightLevel === 'number';
    if (hasOrganizer || hasHighlight) {
      legacyCounts.set(t.categoryId, (legacyCounts.get(t.categoryId) || 0) + 1);
    }
  });
  const legacyTop = Array.from(legacyCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (legacyTop && legacyTop[1] >= 3) {
    return legacyTop[0];
  }

  return '';
}

export function isTeamScheduleTask(task: Task, teamScheduleCategoryId: string): boolean {
  if (teamScheduleCategoryId && task.categoryId === teamScheduleCategoryId) return true;
  if (task.source === 'team') return true;
  return false;
}

