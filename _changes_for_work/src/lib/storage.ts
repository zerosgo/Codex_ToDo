import { Category, Task, AppData, CATEGORY_COLORS } from './types';

const STORAGE_KEY = 'local-tasks-data';

// Generate unique ID
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get all data from LocalStorage
export function getData(): AppData {
    if (typeof window === 'undefined') {
        return { categories: [], tasks: [] };
    }

    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        // Initialize with default category
        const defaultData: AppData = {
            categories: [
                {
                    id: generateId(),
                    name: '내 할 일',
                    color: CATEGORY_COLORS[0].value,
                    order: 0,
                    createdAt: new Date().toISOString(),
                },
            ],
            tasks: [],
        };
        saveData(defaultData);
        return defaultData;
    }

    return JSON.parse(data);
}

// Save all data to LocalStorage
export function saveData(data: AppData): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Category CRUD
export function getCategories(): Category[] {
    return getData().categories.sort((a, b) => a.order - b.order);
}

export function addCategory(name: string): Category {
    const data = getData();
    const maxOrder = Math.max(...data.categories.map(c => c.order), -1);
    const colorIndex = data.categories.length % CATEGORY_COLORS.length;
    const newCategory: Category = {
        id: generateId(),
        name,
        color: CATEGORY_COLORS[colorIndex].value,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
    };
    data.categories.push(newCategory);
    saveData(data);
    return newCategory;
}

export function updateCategory(id: string, updates: Partial<Category>): Category | null {
    const data = getData();
    const index = data.categories.findIndex(c => c.id === id);
    if (index === -1) return null;

    data.categories[index] = { ...data.categories[index], ...updates };
    saveData(data);
    return data.categories[index];
}

export function deleteCategory(id: string): boolean {
    const data = getData();
    const index = data.categories.findIndex(c => c.id === id);
    if (index === -1) return false;

    // Delete all tasks in this category
    data.tasks = data.tasks.filter(t => t.categoryId !== id);
    data.categories.splice(index, 1);
    saveData(data);
    return true;
}

// Task CRUD
export function getTasks(categoryId?: string): Task[] {
    const data = getData();
    let tasks = data.tasks;
    if (categoryId) {
        tasks = tasks.filter(t => t.categoryId === categoryId);
    }
    return tasks.sort((a, b) => a.order - b.order);
}

export function addTask(categoryId: string, title: string, dueDate?: string | null): Task {
    const data = getData();
    const categoryTasks = data.tasks.filter(t => t.categoryId === categoryId);
    const maxOrder = Math.max(...categoryTasks.map(t => t.order), -1);

    const newTask: Task = {
        id: generateId(),
        categoryId,
        title,
        assignee: '',
        resourceUrl: '',
        notes: '',
        dueDate: dueDate || null,
        dueTime: null,
        completed: false,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
    };

    data.tasks.push(newTask);
    saveData(data);

    // Auto-sort by due date after adding
    sortTasksByDate(categoryId);

    return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
    const data = getData();
    const index = data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    data.tasks[index] = { ...data.tasks[index], ...updates };
    saveData(data);
    return data.tasks[index];
}

export function deleteTask(id: string): boolean {
    const data = getData();
    const index = data.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;

    data.tasks.splice(index, 1);
    saveData(data);
    return true;
}

export function toggleTaskComplete(id: string): Task | null {
    const data = getData();
    const index = data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    data.tasks[index].completed = !data.tasks[index].completed;
    saveData(data);
    return data.tasks[index];
}

// Reorder tasks
export function reorderTasks(categoryId: string, taskIds: string[]): void {
    const data = getData();
    taskIds.forEach((id, index) => {
        const taskIndex = data.tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
            data.tasks[taskIndex].order = index;
        }
    });
    saveData(data);
}

// Sort tasks by date (only non-completed tasks)
export function sortTasksByDate(categoryId: string): void {
    const data = getData();

    // Only sort non-completed tasks
    const activeTasks = data.tasks
        .filter(t => t.categoryId === categoryId && !t.completed)
        .sort((a, b) => {
            // Tasks without due date go to the end
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

    activeTasks.forEach((task, index) => {
        const taskIndex = data.tasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
            data.tasks[taskIndex].order = index;
        }
    });

    saveData(data);
}

// Export data as JSON
export function exportData(): string {
    const data = getData();
    return JSON.stringify(data, null, 2);
}

// Import data from JSON
export function importData(jsonString: string): boolean {
    try {
        const data = JSON.parse(jsonString) as AppData;

        // Validate data structure
        if (!Array.isArray(data.categories) || !Array.isArray(data.tasks)) {
            throw new Error('Invalid data structure');
        }

        saveData(data);
        return true;
    } catch (error) {
        console.error('Import failed:', error);
        return false;
    }
}

// Quick Links - stored separately
const QUICK_LINKS_KEY = 'local-tasks-quick-links';

import { QuickLink } from './types';

export function getQuickLinks(): QuickLink[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(QUICK_LINKS_KEY);
    if (!data) return [];
    return JSON.parse(data).sort((a: QuickLink, b: QuickLink) => a.order - b.order);
}

export function saveQuickLinks(links: QuickLink[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUICK_LINKS_KEY, JSON.stringify(links));
}

export function addQuickLink(name: string, url: string): QuickLink {
    const links = getQuickLinks();
    const maxOrder = Math.max(...links.map(l => l.order), -1);
    const newLink: QuickLink = {
        id: generateId(),
        name,
        url,
        order: maxOrder + 1,
    };
    links.push(newLink);
    saveQuickLinks(links);
    return newLink;
}

export function updateQuickLink(id: string, updates: Partial<QuickLink>): QuickLink | null {
    const links = getQuickLinks();
    const index = links.findIndex(l => l.id === id);
    if (index === -1) return null;
    links[index] = { ...links[index], ...updates };
    saveQuickLinks(links);
    return links[index];
}

export function deleteQuickLink(id: string): boolean {
    const links = getQuickLinks();
    const index = links.findIndex(l => l.id === id);
    if (index === -1) return false;
    links.splice(index, 1);
    saveQuickLinks(links);
    return true;
}

export function reorderQuickLinks(linkIds: string[]): void {
    const links = getQuickLinks();
    linkIds.forEach((id, index) => {
        const linkIndex = links.findIndex(l => l.id === id);
        if (linkIndex !== -1) {
            links[linkIndex].order = index;
        }
    });
    saveQuickLinks(links);
}
