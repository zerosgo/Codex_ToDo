"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Category, Task } from '@/lib/types';
import { getCategories, getTasks, addTask } from '@/lib/storage';
import { Sidebar } from '@/components/sidebar';
import { TaskList } from '@/components/task-list';
import { CalendarView } from '@/components/calendar-view';
import { TaskDetailDialog } from '@/components/task-detail-dialog';
import { ImportExportDialog } from '@/components/import-export-dialog';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogType, setDialogType] = useState<'export' | 'import' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [taskListWidth, setTaskListWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load categories from LocalStorage
  const loadCategories = useCallback(() => {
    const cats = getCategories();
    setCategories(cats);
    return cats;
  }, []);

  // Load tasks for selected categories (multiple)
  const loadTasks = useCallback(() => {
    if (selectedCategoryIds.length > 0) {
      const allTasks = selectedCategoryIds.flatMap(id => getTasks(id));
      setTasks(allTasks);
    } else {
      setTasks([]);
    }
  }, [selectedCategoryIds]);

  // Initial load
  useEffect(() => {
    const cats = loadCategories();
    if (cats.length > 0 && selectedCategoryIds.length === 0) {
      setSelectedCategoryIds([cats[0].id]);
    }
    setIsLoading(false);
  }, [loadCategories, selectedCategoryIds.length]);

  // Load tasks when category changes
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const sidebarWidth = isSidebarVisible ? 180 : 0;
      const newWidth = e.clientX - containerRect.left - sidebarWidth;

      // Clamp between 250 and 600
      const clampedWidth = Math.max(250, Math.min(600, newWidth));
      setTaskListWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isSidebarVisible]);

  const handleCategoriesChange = () => {
    const cats = loadCategories();
    // Keep only valid category IDs
    setSelectedCategoryIds(prev => {
      const validIds = prev.filter(id => cats.some(c => c.id === id));
      return validIds.length > 0 ? validIds : (cats.length > 0 ? [cats[0].id] : []);
    });
  };

  const handleTasksChange = () => {
    loadTasks();
  };

  const handleDataChange = () => {
    const cats = loadCategories();
    if (cats.length > 0) {
      setSelectedCategoryIds([cats[0].id]);
    } else {
      setSelectedCategoryIds([]);
    }
  };

  const handleDateClick = (date: Date) => {
    const firstSelectedId = selectedCategoryIds[0];
    if (firstSelectedId) {
      // Pass dueDate directly to addTask so auto-sort works correctly
      const newTask = addTask(firstSelectedId, '새 할일', date.toISOString());
      loadTasks();
      setDetailTask({ ...newTask, dueDate: date.toISOString() });
    }
  };

  const handleTaskDrop = (taskId: string, newDate: Date) => {
    // Find the task to get its categoryId
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    import('@/lib/storage').then(({ updateTask, sortTasksByDate }) => {
      updateTask(taskId, { dueDate: newDate.toISOString() });
      // Sort tasks by date after updating
      sortTasksByDate(task.categoryId);
      loadTasks();
    });
  };

  // Handle category selection with Ctrl support
  const handleSelectCategory = (categoryId: string, ctrlKey: boolean) => {
    if (ctrlKey) {
      // Toggle in multi-select
      setSelectedCategoryIds(prev =>
        prev.includes(categoryId)
          ? prev.filter(id => id !== categoryId)
          : [...prev, categoryId]
      );
    } else {
      // Single select
      setSelectedCategoryIds([categoryId]);
    }
  };

  const selectedCategory = categories.find(c => selectedCategoryIds.includes(c.id)) || null;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-screen bg-gray-50 relative">
      {/* Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        className={`absolute top-4 z-50 bg-white shadow-md hover:shadow-lg transition-all duration-200 ${isSidebarVisible ? 'left-[252px]' : 'left-4'
          }`}
        title={isSidebarVisible ? "사이드바 숨기기" : "사이드바 보이기"}
      >
        {isSidebarVisible ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeft className="w-5 h-5" />
        )}
      </Button>

      {/* Sidebar with Animation */}
      <AnimatePresence>
        {isSidebarVisible && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden flex-shrink-0"
          >
            <Sidebar
              categories={categories}
              selectedCategoryIds={selectedCategoryIds}
              tasks={tasks}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectCategory={handleSelectCategory}
              onCategoriesChange={handleCategoriesChange}
              onExportClick={() => setDialogType('export')}
              onImportClick={() => setDialogType('import')}
              onMonthChange={setCurrentMonth}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setCurrentMonth(date);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List - Resizable */}
      <div
        className="flex-shrink-0 bg-white overflow-hidden"
        style={{
          width: taskListWidth,
          // Disable transition during resize for smooth movement
          transition: isResizing ? 'none' : 'width 0.15s ease-out'
        }}
      >
        <TaskList
          category={selectedCategory}
          categories={categories}
          tasks={tasks}
          onTasksChange={handleTasksChange}
        />
      </div>

      {/* Resize Handle */}
      <div
        className={`w-2 flex-shrink-0 cursor-col-resize group ${isResizing ? 'bg-blue-500' : 'bg-gray-100 hover:bg-blue-400'
          }`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      >
        {/* Visual indicator */}
        <div className={`w-full h-full flex items-center justify-center ${isResizing ? '' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity`}>
          <div className="w-0.5 h-8 bg-gray-400 rounded-full" />
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-hidden">
        <CalendarView
          tasks={tasks}
          categories={categories}
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onTaskClick={(task) => setDetailTask(task)}
          onDateClick={handleDateClick}
          onMonthChange={setCurrentMonth}
          onTaskDrop={handleTaskDrop}
          onTaskDelete={handleTasksChange}
        />
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={detailTask}
        isOpen={!!detailTask}
        onClose={() => setDetailTask(null)}
        onTaskChange={handleTasksChange}
      />

      {/* Import/Export Dialog */}
      <ImportExportDialog
        type={dialogType}
        onClose={() => setDialogType(null)}
        onDataChange={handleDataChange}
      />
    </div>
  );
}
