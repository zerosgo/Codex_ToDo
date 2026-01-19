"use client";

import React from 'react';
import { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MiniCalendarProps {
    currentMonth: Date;
    selectedDate?: Date;
    tasks: Task[];
    onMonthChange: (date: Date) => void;
    onDateSelect: (date: Date) => void;
}

export function MiniCalendar({
    currentMonth,
    selectedDate,
    tasks,
    onMonthChange,
    onDateSelect
}: MiniCalendarProps) {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const nextMonth = () => onMonthChange(addMonths(currentMonth, 1));
    const prevMonth = () => onMonthChange(subMonths(currentMonth, 1));

    // Check if a date has tasks
    const hasTasksOnDate = (date: Date): boolean => {
        return tasks.some(task => {
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

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-2 transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={prevMonth}>
                    <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs font-medium dark:text-gray-200">
                    {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                </span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={nextMonth}>
                    <ChevronRight className="h-3 w-3" />
                </Button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 mb-1">
                {weekDays.map((day, index) => (
                    <div
                        key={day}
                        className={`text-center text-[10px] font-medium ${index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-400'
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const hasTasks = hasTasksOnDate(day);
                    const dayOfWeek = day.getDay();

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => onDateSelect(day)}
                            className={`
                                relative w-6 h-6 text-[10px] rounded-full flex items-center justify-center
                                transition-colors cursor-pointer
                                ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' :
                                    isToday(day) ? 'bg-blue-600 text-white font-bold' :
                                        isSelected ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                                            dayOfWeek === 0 ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30' :
                                                dayOfWeek === 6 ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30' :
                                                    'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }
                            `}
                        >
                            {format(day, 'd')}
                            {/* Task indicator dot */}
                            {hasTasks && isCurrentMonth && !isToday(day) && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
