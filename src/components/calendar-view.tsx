"use client";

import React, { useState, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isToday,
    isSameDay,
    addDays,
    getWeek,
    getMonth,
    getYear,
    parse,
    addHours,
    isWithinInterval
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Task, Category } from '@/lib/types';
import { ChevronLeft, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarViewProps {
    tasks: Task[];
    categories: Category[];
    currentMonth: Date;
    selectedDate?: Date;
    showWeekends: boolean;
    onShowWeekendsChange: (show: boolean) => void;
    onTaskClick: (task: Task) => void;
    onDateClick?: (date: Date) => void;
    onMonthChange: (date: Date) => void;
    onTaskDrop: (taskId: string, newDate: Date) => void;
    onTaskCopy: (taskId: string, newDate: Date) => void;
    onTaskDelete: () => void;
}

export function CalendarView({
    tasks,
    categories,
    currentMonth,
    selectedDate,
    showWeekends,
    onShowWeekendsChange,
    onTaskClick,
    onDateClick,
    onMonthChange,
    onTaskDrop,
    onTaskCopy,
    onTaskDelete
}: CalendarViewProps) {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dropTargetDate, setDropTargetDate] = useState<Date | null>(null);
    const [deleteTaskToConfirm, setDeleteTaskToConfirm] = useState<Task | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Smart Update: Set timeout for the next significant event (Meeting Start or Meeting End)
    useEffect(() => {
        const updateTime = () => setCurrentTime(new Date());

        const now = new Date();

        // Find all "Team Schedule" tasks for today
        const scheduleCategory = categories.find(c => c.name === '팀 일정');
        const todaysSchedules = tasks.filter(t =>
            t.categoryId === scheduleCategory?.id &&
            t.dueDate &&
            isSameDay(new Date(t.dueDate), now) &&
            t.dueTime // Must have time
        );

        // Collect all significant time points (Start and End times)
        const timePoints: number[] = [];

        todaysSchedules.forEach(task => {
            if (!task.dueTime) return;
            try {
                // Try parse "HH:mm - HH:mm" first
                const rangeMatch = task.dueTime.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
                let startTime = new Date(now);
                let endTime = new Date(now);

                if (rangeMatch) {
                    const [_, startH, startM, endH, endM] = rangeMatch;
                    startTime.setHours(parseInt(startH), parseInt(startM), 0, 0);
                    endTime.setHours(parseInt(endH), parseInt(endM), 0, 0);

                    // Handle case where end time is next day (e.g. 23:00 - 01:00)
                    if (endTime < startTime) {
                        endTime = addDays(endTime, 1);
                    }
                } else {
                    // Fallback to single time "HH:mm" + 1 hour
                    const timeMatch = task.dueTime.match(/(\d{2}):(\d{2})/);
                    if (!timeMatch) return;

                    const [_, hours, minutes] = timeMatch;
                    startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    endTime = addHours(startTime, 1);
                }

                // Check points in the future
                if (startTime > now) timePoints.push(startTime.getTime());
                if (endTime > now) timePoints.push(endTime.getTime());
            } catch (e) {
                // Ignore parsing errors
            }
        });

        // Sort and pick the earliest future time
        timePoints.sort((a, b) => a - b);

        let nextUpdateDelay = 60 * 60 * 1000; // Default: re-check in 1 hour if nothing found

        if (timePoints.length > 0) {
            nextUpdateDelay = timePoints[0] - now.getTime();
        }

        // Cap minimum delay to avoid rapid loops (e.g. 1 second)
        const timeoutId = setTimeout(() => {
            updateTime();
        }, nextUpdateDelay);

        return () => clearTimeout(timeoutId);
    }, [tasks, categories, currentTime]); // Re-calc when tasks change or after time update

    const getTasksForDate = (date: Date) => {
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            return isSameDay(new Date(task.dueDate), date);
        });
    };

    const getTaskColor = (task: Task): string => {
        const category = categories.find(c => c.id === task.categoryId);
        return category?.color || '#3b82f6';
    };

    // Check if a meeting is currently active (Start Time <= Now < End Time)
    const isMeetingActive = (task: Task) => {
        if (!task.dueTime || !task.dueDate) return false;

        try {
            const meetingDate = new Date(task.dueDate);
            // Verify it's the same day first (ignoring time for date comparison)
            if (!isSameDay(meetingDate, currentTime)) return false;

            let startTime = new Date(meetingDate);
            let endTime = new Date(meetingDate);

            // Try parse "HH:mm - HH:mm" first
            const rangeMatch = task.dueTime.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);

            if (rangeMatch) {
                const [_, startH, startM, endH, endM] = rangeMatch;
                startTime.setHours(parseInt(startH), parseInt(startM), 0, 0);
                endTime.setHours(parseInt(endH), parseInt(endM), 0, 0);

                // Handle cross-day (e.g. 23:00 - 00:30)
                // Note: The meetingDate is based on the task's due date.
                // If endTime < startTime, assume it ends the next day.
                if (endTime < startTime) {
                    endTime = addDays(endTime, 1);
                }
            } else {
                // Fallback to single time "HH:mm" + 1 hour
                const timeMatch = task.dueTime.match(/(\d{2}):(\d{2})/);
                if (!timeMatch) return false;

                const [_, hours, minutes] = timeMatch;
                startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                endTime = addHours(startTime, 1);
            }

            // Exclusive end check: start <= now < end
            // isWithinInterval is inclusive [start, end].
            // We want [start, end).
            // Manually check to be precise.
            return currentTime >= startTime && currentTime < endTime;
        } catch (e) {
            return false;
        }
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = e.ctrlKey ? 'copy' : 'move';
    };

    const handleDragOver = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        setDropTargetDate(date);
    };

    const handleDragLeave = () => {
        setDropTargetDate(null);
    };

    const handleDrop = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
            if (e.ctrlKey) {
                onTaskCopy(taskId, date);
            } else {
                onTaskDrop(taskId, date);
            }
        }
        setDropTargetDate(null);
        setDraggedTaskId(null);
    };

    const handleDeleteConfirm = () => {
        if (deleteTaskToConfirm) {
            import('@/lib/storage').then(({ deleteTask }) => {
                deleteTask(deleteTaskToConfirm.id);
                onTaskDelete();
                setDeleteTaskToConfirm(null);
            });
        }
    };

    // Helper to get week number
    const getWeekNumber = (date: Date) => {
        // weekStartsOn: 0 (Sunday) for consistency
        return getWeek(date, { weekStartsOn: 0, firstWeekContainsDate: 1 });
    };

    // Check if a week is entirely in the past
    // Logic: Week Ends before Today starts.
    const isPastWeek = (weekStartDate: Date) => {
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 0 }); // Sunday start
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return weekEndDate < today;
    };

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between py-2 px-1 mb-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onMonthChange(new Date())}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        오늘
                    </button>
                    <button
                        onClick={() => onShowWeekendsChange(!showWeekends)}
                        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${showWeekends
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                    >
                        {showWeekends ? '토/일 보기' : '토/일 숨기기'}
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onMonthChange(subMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 min-w-[120px] text-center">
                        {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                    </h2>
                    <button
                        onClick={() => onMonthChange(addMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Empty div for layout balance */}
                <div className="w-[140px]"></div>
            </div>
        );
    };

    const renderDays = () => {
        // Changed order to start with Sunday
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return (
            <div className={`grid ${showWeekends ? 'grid-cols-[32px_minmax(0,0.5fr)_repeat(5,minmax(0,1fr))_minmax(0,0.5fr)]' : 'grid-cols-[32px_repeat(5,minmax(0,1fr))]'} border-b border-gray-200 dark:border-gray-700`}>
                <div className="w-8 border-r border-gray-200 dark:border-gray-700"></div> {/* Week number column header */}
                {days.map((day, i) => {
                    // i=0 (Sun), i=6 (Sat)
                    // If weekends hidden, hide Sun(0) and Sat(6)
                    if (!showWeekends && (i === 0 || i === 6)) return null;
                    return (
                        <div
                            key={day}
                            className={`py-2 text-center text-sm font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
                                } border-r border-gray-200 dark:border-gray-700 last:border-r-0`}
                        >
                            {day}
                        </div>
                    );
                })}
            </div>
        );
    };

    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

    const toggleWeekExpansion = (weekNum: number) => {
        const newExpanded = new Set(expandedWeeks);
        if (newExpanded.has(weekNum)) {
            newExpanded.delete(weekNum);
        } else {
            newExpanded.add(weekNum);
        }
        setExpandedWeeks(newExpanded);
    };

    // ... (existing code)

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        // Change weekStartsOn to 0 (Sunday)
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const weeks: Date[][] = [];
        let currentWeek: Date[] = [];

        days.forEach((day) => {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        return (
            <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-gray-900 select-none">
                {weeks.map((weekDays, weekIndex) => {
                    const firstDayOfWeek = weekDays[0];
                    const weekNum = getWeekNumber(firstDayOfWeek);
                    const isWeekPast = isPastWeek(firstDayOfWeek);
                    const isExpanded = expandedWeeks.has(weekNum);

                    return (
                        <div
                            key={`week-${weekIndex}`}
                            className={`grid shrink-0 ${showWeekends ? 'grid-cols-[32px_minmax(0,0.5fr)_repeat(5,minmax(0,1fr))_minmax(0,0.5fr)]' : 'grid-cols-[32px_repeat(5,minmax(0,1fr))]'}`}
                        >
                            {/* Week Number Cell with Checkbox */}
                            <div className="border-b border-r border-gray-200 dark:border-gray-700 flex flex-col items-center pt-2 bg-gray-50 dark:bg-gray-900/50 gap-1">
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-600">
                                    W{weekNum.toString().padStart(2, '0')}
                                </span>
                                {isWeekPast && (
                                    <input
                                        type="checkbox"
                                        checked={isExpanded}
                                        onChange={() => toggleWeekExpansion(weekNum)}
                                        className="w-3 h-3 cursor-pointer"
                                        title="팀 일정 보기"
                                    />
                                )}
                            </div>

                            {/* Day Cells */}
                            {weekDays.map((day) => {
                                const dayOfWeek = day.getDay(); // 0=Sun, 6=Sat
                                if (!showWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) return null;

                                const dayTasks = getTasksForDate(day);
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isDropTarget = dropTargetDate && isSameDay(day, dropTargetDate);

                                // Split tasks into Schedule and Regular
                                const scheduleCategory = categories.find(c => c.name === '팀 일정');

                                // REFINED: Show schedule tasks if not past week OR if explicitly expanded
                                const scheduleTasks = (!isWeekPast || isExpanded)
                                    ? dayTasks.filter(t => t.categoryId === scheduleCategory?.id)
                                    : [];

                                const regularTasks = dayTasks.filter(t => t.categoryId !== scheduleCategory?.id);

                                // Regular tasks display logic


                                return (
                                    <motion.div
                                        key={day.toISOString()}
                                        className={`min-h-[60px] border-b border-r border-gray-200 dark:border-gray-700 p-1 transition-colors ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'
                                            } ${isToday(day) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''} ${isDropTarget ? 'bg-blue-100 dark:bg-blue-800/50 ring-2 ring-blue-400 ring-inset' : ''
                                            } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                                        onClick={() => onDateClick?.(day)}
                                        onDragOver={(e) => handleDragOver(e, day)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, day)}
                                    >
                                        {/* Date Number */}
                                        <div className={`text-sm font-medium mb-1 ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' :
                                            dayOfWeek === 0 ? 'text-red-500' :
                                                dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700 dark:text-gray-200'
                                            } ${isToday(day) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                                            {format(day, 'd')}
                                        </div>

                                        <div className="space-y-0.5">
                                            {/* 1. Schedule Tasks (Simple Text) */}
                                            {/* Past weeks: limit to 3, Current/Future weeks: show all */}
                                            {(isWeekPast ? scheduleTasks.slice(0, 3) : scheduleTasks).map((task) => {
                                                const isActive = isMeetingActive(task);
                                                const highlightLevel = task.highlightLevel || 0;
                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={`flex items-center text-xs px-1 py-0.5 font-medium rounded cursor-pointer transition-colors w-full group/schedule border-l-[3px] ${isActive
                                                            ? 'bg-yellow-200 text-yellow-900 border-yellow-500 dark:bg-yellow-600 dark:text-yellow-50 dark:border-yellow-300 font-bold'
                                                            : highlightLevel > 0
                                                                ? `bg-gray-100 dark:bg-gray-800 ${highlightLevel === 1 ? 'border-blue-500 text-gray-900 dark:text-gray-100' :
                                                                    highlightLevel === 2 ? 'border-green-500 text-gray-900 dark:text-gray-100' :
                                                                        'border-purple-500 text-gray-900 dark:text-gray-100'
                                                                }`
                                                                : 'bg-transparent border-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                            }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onTaskClick(task);
                                                        }}
                                                        title={`${task.title}${task.dueTime ? ` (${task.dueTime})` : ''} ${isActive ? '[진행 중]' : ''}`}
                                                    >
                                                        <div className="truncate w-full min-w-0 flex items-center">
                                                            {task.dueTime ? <span className="mr-1 opacity-75 whitespace-nowrap">{task.dueTime.match(/(\d{2}:\d{2})/)?.[0] || task.dueTime}</span> : ''}
                                                            <span className="truncate">{task.title}</span>
                                                            {highlightLevel === 1 && <div className="w-2 h-2 rounded-full ml-auto shrink-0 bg-blue-500" />}
                                                            {highlightLevel === 2 && <div className="w-2 h-2 rounded-full ml-auto shrink-0 bg-green-500" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {isWeekPast && scheduleTasks.length > 3 && (
                                                <div className="text-[10px] text-gray-400 dark:text-gray-500 px-1 cursor-help" title={`${scheduleTasks.length - 3}개의 일정이 더 있습니다`}>
                                                    + 팀 일정 {scheduleTasks.length - 3}개 더
                                                </div>
                                            )}

                                            {/* Divider if both exist */}
                                            {scheduleTasks.length > 0 && regularTasks.length > 0 && (
                                                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-1 mx-1" />
                                            )}

                                            {/* 2. Regular Tasks (Box Style) */}
                                            {/* Past weeks: limit to 3, Current/Future weeks: show all */}
                                            {(isWeekPast ? regularTasks.slice(0, 3) : regularTasks).map((task) => {
                                                const taskColor = getTaskColor(task);
                                                const isOverdue = task.dueDate && !task.completed &&
                                                    new Date(task.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

                                                return (
                                                    <div
                                                        key={task.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                                        onDragEnd={() => setDraggedTaskId(null)}
                                                        className={`group/task relative text-xs px-1.5 py-1 rounded cursor-grab active:cursor-grabbing transition-all w-full overflow-hidden ${draggedTaskId === task.id ? 'opacity-50 scale-95' : ''
                                                            } ${task.completed ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 line-through' : 'dark:!bg-gray-700 dark:!text-gray-300'}`}
                                                        style={task.completed ? {
                                                            borderLeft: '3px solid #d1d5db',
                                                        } : isOverdue ? {
                                                            backgroundColor: '#fee2e2',
                                                            color: '#b91c1c',
                                                            borderLeft: '3px solid #ef4444',
                                                        } : {
                                                            backgroundColor: `${taskColor}15`,
                                                            color: taskColor,
                                                            borderLeft: `3px solid ${taskColor}`,
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onTaskClick(task);
                                                        }}
                                                        title={`${task.title}${task.dueTime ? ` (${task.dueTime})` : ''}`}
                                                    >
                                                        <div className="flex items-center justify-between w-full min-w-0">
                                                            <div className="truncate flex-1 min-w-0 flex items-center">
                                                                {task.dueTime && <span className="opacity-60 mr-1 whitespace-nowrap">{task.dueTime}</span>}
                                                                <span className="truncate">{task.title}</span>
                                                            </div>
                                                            <button
                                                                className="opacity-0 group-hover/task:opacity-100 ml-1 p-0.5 rounded hover:bg-red-100 transition-opacity flex-shrink-0"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteTaskToConfirm(task);
                                                                }}
                                                            >
                                                                <Trash2 className="w-3 h-3 text-red-500" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {isWeekPast && regularTasks.length > 3 && (
                                                <div className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                                                    +{regularTasks.length - 3}개 더
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
            {renderHeader()}
            {renderDays()}
            {renderCells()}

            {/* Delete Confirmation Overlay */}
            <AnimatePresence>
                {deleteTaskToConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
                        onClick={() => setDeleteTaskToConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-[300px]"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold mb-2 dark:text-white">할 일 삭제</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                                "{deleteTaskToConfirm.title}"을(를) 삭제하시겠습니까?
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    onClick={() => setDeleteTaskToConfirm(null)}
                                >
                                    취소
                                </button>
                                <button
                                    className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
                                    onClick={handleDeleteConfirm}
                                >
                                    삭제
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
