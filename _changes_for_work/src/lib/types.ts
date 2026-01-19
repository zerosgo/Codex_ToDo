export interface Category {
    id: string;
    name: string;
    color: string; // hex color code like #3b82f6
    order: number;
    createdAt: string;
}

export interface Task {
    id: string;
    categoryId: string;
    title: string;
    assignee: string;
    resourceUrl: string;
    notes: string;
    dueDate: string | null;
    dueTime: string | null; // HH:mm format like "14:30"
    completed: boolean;
    order: number;
    createdAt: string;
}

export interface AppData {
    categories: Category[];
    tasks: Task[];
}

// Predefined color palette for categories
export const CATEGORY_COLORS = [
    { name: '파랑', value: '#3b82f6' },
    { name: '초록', value: '#22c55e' },
    { name: '빨강', value: '#ef4444' },
    { name: '주황', value: '#f97316' },
    { name: '보라', value: '#a855f7' },
    { name: '분홍', value: '#ec4899' },
    { name: '청록', value: '#06b6d4' },
    { name: '노랑', value: '#eab308' },
];

// Quick Link for favorite files
export interface QuickLink {
    id: string;
    name: string;
    url: string;
    order: number;
}
