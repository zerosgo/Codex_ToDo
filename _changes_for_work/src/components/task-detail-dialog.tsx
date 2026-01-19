"use client";

import React, { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { updateTask, sortTasksByDate } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, X, Link } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskDetailDialogProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onTaskChange: () => void;
    onSortByDate?: () => void;
}

export function TaskDetailDialog({
    task,
    isOpen,
    onClose,
    onTaskChange,
    onSortByDate,
}: TaskDetailDialogProps) {
    const [title, setTitle] = useState('');
    const [assignee, setAssignee] = useState('');
    const [resourceUrl, setResourceUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [dueTime, setDueTime] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [dueDateChanged, setDueDateChanged] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setAssignee(task.assignee || '');
            setResourceUrl(task.resourceUrl || '');
            setNotes(task.notes);
            setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
            setDueTime(task.dueTime || '');
            setDueDateChanged(false);
        }
    }, [task]);

    const handleSave = (shouldSort: boolean = false) => {
        if (task && title.trim()) {
            updateTask(task.id, {
                title: title.trim(),
                assignee: assignee.trim(),
                resourceUrl: resourceUrl.trim(),
                notes,
                dueDate: dueDate ? dueDate.toISOString() : null,
                dueTime: dueTime || null,
            });

            // If due date was changed and Enter was pressed, auto-sort
            if (shouldSort && dueDateChanged && onSortByDate) {
                sortTasksByDate(task.categoryId);
            }

            onTaskChange();
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Don't trigger on Shift+Enter (for textarea newlines)
            const target = e.target as HTMLElement;
            if (target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                handleSave(true);  // Save and sort
            }
        }
    };

    const handleDateSelect = (date: Date | undefined) => {
        setDueDate(date);
        setDueDateChanged(true);
        setIsCalendarOpen(false);
    };

    const handleClearDate = () => {
        setDueDate(undefined);
        setDueDateChanged(true);
    };

    if (!task) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle>할 일 상세</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">제목</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="할 일 제목"
                            className="mt-1"
                        />
                    </div>

                    {/* Assignee */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">담당자</label>
                        <Input
                            value={assignee}
                            onChange={(e) => setAssignee(e.target.value)}
                            placeholder="담당자 이름 또는 부서"
                            className="mt-1"
                        />
                    </div>

                    {/* Resource URL */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">자료</label>
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                value={resourceUrl}
                                onChange={(e) => setResourceUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="flex-1"
                            />
                            {resourceUrl && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(resourceUrl, '_blank')}
                                    className="h-10 px-3"
                                    title="링크 열기"
                                >
                                    <Link className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Due Date & Time */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">마감 기한</label>
                        <div className="flex items-center gap-2 mt-1">
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`justify-start text-left font-normal flex-1 ${!dueDate && 'text-muted-foreground'
                                            }`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dueDate ? format(dueDate, 'PPP', { locale: ko }) : '날짜 선택'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dueDate}
                                        onSelect={handleDateSelect}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Time Selector - 24hour format, 00/30 minutes only */}
                            {/* Work hours (08:00-18:00) shown first for convenience */}
                            <select
                                value={dueTime}
                                onChange={(e) => {
                                    setDueTime(e.target.value);
                                    setDueDateChanged(true);
                                }}
                                className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">시간</option>
                                <optgroup label="업무 시간">
                                    {Array.from({ length: 11 }, (_, i) => i + 8).map((hour) => (
                                        <React.Fragment key={hour}>
                                            <option value={`${hour.toString().padStart(2, '0')}:00`}>
                                                {hour.toString().padStart(2, '0')}:00
                                            </option>
                                            <option value={`${hour.toString().padStart(2, '0')}:30`}>
                                                {hour.toString().padStart(2, '0')}:30
                                            </option>
                                        </React.Fragment>
                                    ))}
                                </optgroup>
                                <optgroup label="기타 시간">
                                    {Array.from({ length: 8 }, (_, i) => i).map((hour) => (
                                        <React.Fragment key={hour}>
                                            <option value={`${hour.toString().padStart(2, '0')}:00`}>
                                                {hour.toString().padStart(2, '0')}:00
                                            </option>
                                            <option value={`${hour.toString().padStart(2, '0')}:30`}>
                                                {hour.toString().padStart(2, '0')}:30
                                            </option>
                                        </React.Fragment>
                                    ))}
                                    {Array.from({ length: 5 }, (_, i) => i + 19).map((hour) => (
                                        <React.Fragment key={hour}>
                                            <option value={`${hour.toString().padStart(2, '0')}:00`}>
                                                {hour.toString().padStart(2, '0')}:00
                                            </option>
                                            <option value={`${hour.toString().padStart(2, '0')}:30`}>
                                                {hour.toString().padStart(2, '0')}:30
                                            </option>
                                        </React.Fragment>
                                    ))}
                                </optgroup>
                            </select>

                            {dueDate && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearDate}
                                    className="h-10 w-10 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        {dueDateChanged && (
                            <p className="text-xs text-blue-500 mt-1">
                                Enter를 누르면 마감일순으로 자동 정렬됩니다
                            </p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">메모</label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="상세 메모를 입력하세요..."
                            className="mt-1 min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                    <Button onClick={() => handleSave(dueDateChanged)}>저장</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
