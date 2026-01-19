"use client";

import React, { useState } from 'react';
import { Task, Category } from '@/lib/types';
import { deleteTask } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarViewProps {
    tasks: Task[];
    categories: Category[];
    currentMonth: Date;
    selectedDate?: Date;
    onTaskClick: (task: Task) => void;
    onDateClick?: (date: Date) => void;
    onMonthChange: (date: Date) => void;
    onTaskDrop?: (taskId: string, newDate: Date) => void;
    onTaskDelete?: () => void;
}

export function CalendarView({ tasks, categories, currentMonth, selectedDate, onTaskClick, onDateClick, onMonthChange, onTaskDrop, onTaskDelete }: CalendarViewProps) {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dropTargetDate, setDropTargetDate] = useState<Date | null>(null);
    const [deleteTaskToConfirm, setDeleteTaskToConfirm] = useState<Task | null>(null);

    // Get category color for a task
    const getTaskColor = (task: Task): string => {
        const category = categories.find(c => c.id === task.categoryId);
        return category?.color || '#3b82f6';
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const nextMonth = () => onMonthChange(addMonths(currentMonth, 1));
    const prevMonth = () => onMonthChange(subMonths(currentMonth, 1));
    const goToToday = () => onMonthChange(new Date());

    // Get tasks for a specific date
    const getTasksForDate = (date: Date): Task[] => {
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            return isSameDay(new Date(task.dueDate), date);
        });
    };

    // Generate calendar days
    const generateDays = () => {
        const days: Date[] = [];
        let day = startDate;
        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    };

    const days = generateDays();
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
        // Add drag styling
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedTaskId(null);
        setDropTargetDate(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTargetDate(date);
    };

    const handleDragLeave = () => {
        setDropTargetDate(null);
    };

    const handleDrop = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId && onTaskDrop) {
            onTaskDrop(taskId, date);
        }
        setDraggedTaskId(null);
        setDropTargetDate(null);
    };

    return (
        <div className="flex-1 flex flex-col bg-white h-full">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        오늘
                    </Button>
                    <Button variant="ghost" size="sm" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <h2 className="text-xl font-semibold">
                    {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                </h2>
                <div className="w-[120px]" /> {/* Spacer for centering */}
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 border-b">
                {weekDays.map((day, index) => (
                    <div
                        key={day}
                        className={`p-2 text-center text-sm font-medium ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
                <AnimatePresence mode="wait">
                    {days.map((day) => {
                        const dayTasks = getTasksForDate(day);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const dayOfWeek = day.getDay();
                        const isDropTarget = dropTargetDate && isSameDay(day, dropTargetDate);

                        return (
                            <motion.div
                                key={day.toISOString()}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`min-h-[100px] border-b border-r p-1 transition-colors ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                                    } ${isToday(day) ? 'bg-blue-50' : ''} ${isDropTarget ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''
                                    } cursor-pointer hover:bg-gray-50`}
                                onClick={() => onDateClick?.(day)}
                                onDragOver={(e) => handleDragOver(e, day)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, day)}
                            >
                                {/* Date Number */}
                                <div className={`text-sm font-medium mb-1 ${!isCurrentMonth ? 'text-gray-300' :
                                    dayOfWeek === 0 ? 'text-red-500' :
                                        dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'
                                    } ${isToday(day) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                                    {format(day, 'd')}
                                </div>

                                {/* Tasks */}
                                <div className="space-y-0.5 overflow-hidden">
                                    {dayTasks.slice(0, 3).map((task) => {
                                        const taskColor = getTaskColor(task);
                                        return (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id)}
                                                onDragEnd={handleDragEnd}
                                                className={`group/task relative text-xs px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing transition-all ${draggedTaskId === task.id ? 'opacity-50 scale-95' : ''
                                                    }`}
                                                style={{
                                                    backgroundColor: task.completed ? '#e5e7eb' : `${taskColor}20`,
                                                    color: task.completed ? '#6b7280' : taskColor,
                                                    borderLeft: `3px solid ${task.completed ? '#9ca3af' : taskColor}`,
                                                    textDecoration: task.completed ? 'line-through' : 'none',
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTaskClick(task);
                                                }}
                                                title={`${task.title}${task.dueTime ? ` (${task.dueTime})` : ''} - 드래그하여 날짜 변경`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="truncate flex-1">
                                                        {task.dueTime && <span className="opacity-60 mr-1">{task.dueTime}</span>}
                                                        {task.title}
                                                    </div>
                                                    {/* Trash icon on hover */}
                                                    <button
                                                        className="opacity-0 group-hover/task:opacity-100 ml-1 p-0.5 rounded hover:bg-red-100 transition-opacity flex-shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteTaskToConfirm(task);
                                                        }}
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="w-3 h-3 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {dayTasks.length > 3 && (
                                        <div className="text-xs text-gray-500 px-1">
                                            +{dayTasks.length - 3}개 더
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTaskToConfirm} onOpenChange={(open) => !open && setDeleteTaskToConfirm(null)}>
                <DialogContent showCloseButton={false} className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>할 일 삭제</DialogTitle>
                        <DialogDescription>
                            "{deleteTaskToConfirm?.title}"을(를) 삭제하시겠습니까?<br />
                            이 작업은 되돌릴 수 없습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTaskToConfirm(null)}
                        >
                            취소
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deleteTaskToConfirm) {
                                    deleteTask(deleteTaskToConfirm.id);
                                    onTaskDelete?.();
                                    setDeleteTaskToConfirm(null);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            삭제
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

