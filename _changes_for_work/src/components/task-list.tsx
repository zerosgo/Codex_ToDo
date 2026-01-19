"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Task, Category } from '@/lib/types';
import { addTask, reorderTasks, sortTasksByDate } from '@/lib/storage';
import { TaskDetailDialog } from './task-detail-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, SortAsc, ArrowUpDown, CheckCircle2, GripVertical, Calendar, FileText, MoreVertical, Trash2, User, Paperclip } from 'lucide-react';
import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { updateTask, deleteTask, toggleTaskComplete } from '@/lib/storage';

interface TaskListProps {
    category: Category | null;
    categories: Category[];
    tasks: Task[];
    onTasksChange: () => void;
}

// Inline TaskItem component with Framer Motion drag
function AnimatedTaskItem({
    task,
    categoryColor,
    onTaskChange,
    onOpenDetail,
}: {
    task: Task;
    categoryColor: string;
    onTaskChange: () => void;
    onOpenDetail: (task: Task) => void;
}) {
    const dragControls = useDragControls();
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleToggle = () => {
        toggleTaskComplete(task.id);
        onTaskChange();
    };

    const handleDelete = () => {
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        deleteTask(task.id);
        onTaskChange();
        setShowDeleteDialog(false);
    };

    const handleTitleSave = () => {
        if (editTitle.trim()) {
            updateTask(task.id, { title: editTitle.trim() });
            onTaskChange();
        } else {
            setEditTitle(task.title);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleSave();
        } else if (e.key === 'Escape') {
            setEditTitle(task.title);
            setIsEditing(false);
        }
    };

    return (
        <>
            <Reorder.Item
                value={task}
                dragListener={true}
                dragControls={dragControls}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    layout: { duration: 0.3 }
                }}
                whileDrag={{
                    zIndex: 1000,
                    cursor: "grabbing"
                }}
                layout
                className={`group flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white shadow-md hover:shadow-lg cursor-grab active:cursor-grabbing ${task.completed ? 'opacity-60' : ''}`}
                style={{
                    position: 'relative',
                    borderLeft: `4px solid ${categoryColor}`,
                }}
                onDoubleClick={() => onOpenDetail(task)}
            >
                {/* Drag Handle */}
                <motion.div
                    onPointerDown={(e) => dragControls.start(e)}
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-0.5 touch-none"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95, cursor: "grabbing" }}
                >
                    <GripVertical className="w-4 h-4" />
                </motion.div>

                {/* Checkbox */}
                <Checkbox
                    checked={task.completed}
                    onCheckedChange={handleToggle}
                    className="mt-0.5 h-5 w-5 rounded-full border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-full text-sm border-b border-blue-500 outline-none pb-1 bg-transparent"
                        />
                    ) : (
                        <div
                            className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                        >
                            {task.title}
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center gap-3 mt-1">
                        {task.dueDate && (
                            <div className={`flex items-center gap-1 text-xs ${new Date(task.dueDate) < new Date() && !task.completed
                                ? 'text-red-500'
                                : 'text-gray-500'
                                }`}>
                                <Calendar className="w-3 h-3" />
                                {format(new Date(task.dueDate), 'M월 d일', { locale: ko })}
                            </div>
                        )}
                        {task.assignee && (
                            <div className="flex items-center gap-1 text-xs text-blue-500">
                                <User className="w-3 h-3" />
                                {task.assignee}
                            </div>
                        )}
                        {task.resourceUrl && (
                            <div
                                className="flex items-center justify-center text-purple-500 cursor-pointer hover:text-purple-700 p-1.5 -m-1.5 rounded hover:bg-purple-50 transition-all hover:scale-125"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(task.resourceUrl, '_blank');
                                }}
                                title={task.resourceUrl}
                            >
                                <Paperclip className="w-4 h-3" />
                            </div>
                        )}
                        {task.notes && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center text-gray-400 cursor-pointer hover:text-gray-600 p-1.5 -m-1.5 rounded hover:bg-gray-100 transition-all hover:scale-125">
                                        <FileText className="w-4 h-3" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px] bg-gray-800 text-white border-gray-700">
                                    <p className="whitespace-pre-wrap text-sm">{task.notes.length > 100 ? task.notes.slice(0, 100) + '...' : task.notes}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                            제목 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpenDetail(task)}>
                            상세 정보
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            삭제
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </Reorder.Item>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent showCloseButton={false} className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>할 일 삭제</DialogTitle>
                        <DialogDescription>
                            "{task.title}"을(를) 삭제하시겠습니까?<br />
                            이 작업은 되돌릴 수 없습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            취소
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            삭제
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function TaskList({ category, categories, tasks, onTasksChange }: TaskListProps) {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [detailTask, setDetailTask] = useState<Task | null>(null);
    const [showNoDueDate, setShowNoDueDate] = useState(true);
    const [showCompleted, setShowCompleted] = useState(true);
    const [deleteTaskToConfirm, setDeleteTaskToConfirm] = useState<Task | null>(null);

    // Get category color for a task
    const getCategoryColor = (task: Task): string => {
        const cat = categories.find(c => c.id === task.categoryId);
        return cat?.color || '#3b82f6';
    };
    const [tasksWithDueDate, setTasksWithDueDate] = useState<Task[]>([]);
    const [tasksNoDueDate, setTasksNoDueDate] = useState<Task[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync local state with props - split into with/without due date
    useEffect(() => {
        const activeTasks = tasks.filter(t => !t.completed);
        setTasksWithDueDate(activeTasks.filter(t => t.dueDate));
        setTasksNoDueDate(activeTasks.filter(t => !t.dueDate));
    }, [tasks]);

    const completedTasks = tasks.filter(t => t.completed);
    const totalActiveTasks = tasksWithDueDate.length + tasksNoDueDate.length;

    // Global Enter key shortcut to activate add task mode
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !isAddingTask && category) {
                const activeElement = document.activeElement;
                const isInputFocused = activeElement instanceof HTMLInputElement ||
                    activeElement instanceof HTMLTextAreaElement;

                if (!isInputFocused) {
                    e.preventDefault();
                    setIsAddingTask(true);
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isAddingTask, category]);

    // Auto-focus input when adding task
    useEffect(() => {
        if (isAddingTask && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAddingTask]);

    const handleAddTask = () => {
        if (category && newTaskTitle.trim()) {
            addTask(category.id, newTaskTitle.trim());
            setNewTaskTitle('');
            onTasksChange();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddTask();
        } else if (e.key === 'Escape') {
            setIsAddingTask(false);
            setNewTaskTitle('');
        }
    };

    const handleSortByDate = () => {
        if (category) {
            sortTasksByDate(category.id);
            onTasksChange();
        }
    };

    const handleReorderWithDueDate = (newOrder: Task[]) => {
        setTasksWithDueDate(newOrder);
        if (category) {
            const allTaskIds = [...newOrder.map(t => t.id), ...tasksNoDueDate.map(t => t.id)];
            reorderTasks(category.id, allTaskIds);
        }
    };

    const handleReorderNoDueDate = (newOrder: Task[]) => {
        setTasksNoDueDate(newOrder);
        if (category) {
            const allTaskIds = [...tasksWithDueDate.map(t => t.id), ...newOrder.map(t => t.id)];
            reorderTasks(category.id, allTaskIds);
        }
    };

    if (!category) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                리스트를 선택하세요
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50 h-screen overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-gray-800">{category.name}</h1>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <ArrowUpDown className="w-4 h-4 mr-2" />
                                    정렬
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={handleSortByDate}>
                                    <SortAsc className="w-4 h-4 mr-2" />
                                    마감일순 정렬
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                    {totalActiveTasks}개의 할 일 {completedTasks.length > 0 && `· ${completedTasks.length}개 완료`}
                </p>
            </div>

            {/* Task List - with proper scrolling */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-6">
                    <div className="max-w-2xl mx-auto space-y-3">
                        {/* Add Task Button/Input */}
                        <AnimatePresence mode="wait">
                            {isAddingTask ? (
                                <motion.div
                                    key="add-input"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-2 p-3 bg-white rounded-lg border-2 border-blue-200"
                                >
                                    <Input
                                        ref={inputRef}
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onBlur={() => {
                                            if (!newTaskTitle.trim()) {
                                                setIsAddingTask(false);
                                            }
                                        }}
                                        placeholder="새 할 일 입력..."
                                        autoFocus
                                        className="border-0 focus-visible:ring-0 text-sm"
                                    />
                                    <Button size="sm" onClick={handleAddTask}>
                                        추가
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div key="add-button">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-blue-600 hover:bg-blue-50"
                                        onClick={() => setIsAddingTask(true)}
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        할 일 추가
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tasks WITH Due Date */}
                        <Reorder.Group
                            axis="y"
                            values={tasksWithDueDate}
                            onReorder={handleReorderWithDueDate}
                            className="space-y-2"
                            layoutScroll
                        >
                            <AnimatePresence>
                                {tasksWithDueDate.map((task: Task) => (
                                    <AnimatedTaskItem
                                        key={task.id}
                                        task={task}
                                        categoryColor={getCategoryColor(task)}
                                        onTaskChange={onTasksChange}
                                        onOpenDetail={setDetailTask}
                                    />
                                ))}
                            </AnimatePresence>
                        </Reorder.Group>

                        {/* Tasks WITHOUT Due Date Section */}
                        {tasksNoDueDate.length > 0 && (
                            <motion.div
                                className="pt-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <button
                                    onClick={() => setShowNoDueDate(!showNoDueDate)}
                                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <Calendar className="w-4 h-4" />
                                    마감기한 없음 ({tasksNoDueDate.length})
                                    <motion.span
                                        animate={{ rotate: showNoDueDate ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        ▼
                                    </motion.span>
                                </button>

                                <AnimatePresence>
                                    {showNoDueDate && (
                                        <motion.div
                                            className="mt-3"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            <Reorder.Group
                                                axis="y"
                                                values={tasksNoDueDate}
                                                onReorder={handleReorderNoDueDate}
                                                className="space-y-2"
                                                layoutScroll
                                            >
                                                <AnimatePresence>
                                                    {tasksNoDueDate.map((task: Task) => (
                                                        <AnimatedTaskItem
                                                            key={task.id}
                                                            task={task}
                                                            categoryColor={getCategoryColor(task)}
                                                            onTaskChange={onTasksChange}
                                                            onOpenDetail={setDetailTask}
                                                        />
                                                    ))}
                                                </AnimatePresence>
                                            </Reorder.Group>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Completed Tasks Section */}
                        {completedTasks.length > 0 && (
                            <motion.div
                                className="pt-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <button
                                    onClick={() => setShowCompleted(!showCompleted)}
                                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    완료됨 ({completedTasks.length})
                                    <motion.span
                                        animate={{ rotate: showCompleted ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        ▼
                                    </motion.span>
                                </button>

                                <AnimatePresence>
                                    {showCompleted && (
                                        <motion.div
                                            className="mt-3 space-y-2"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            {completedTasks.map((task) => (
                                                <motion.div
                                                    key={task.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className="group flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white shadow-md"
                                                    onDoubleClick={() => setDetailTask(task)}
                                                >
                                                    <div className="text-gray-300 mt-0.5">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>
                                                    <Checkbox
                                                        checked={task.completed}
                                                        onCheckedChange={() => {
                                                            toggleTaskComplete(task.id);
                                                            onTasksChange();
                                                        }}
                                                        className="mt-0.5 h-5 w-5 rounded-full border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm line-through text-gray-500">
                                                            {task.title}
                                                        </div>
                                                        {/* Meta Info for completed tasks */}
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {task.dueDate && (
                                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {format(new Date(task.dueDate), 'M월 d일', { locale: ko })}
                                                                </div>
                                                            )}
                                                            {task.assignee && (
                                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <User className="w-3 h-3" />
                                                                    {task.assignee}
                                                                </div>
                                                            )}
                                                            {task.resourceUrl && (
                                                                <div
                                                                    className="flex items-center justify-center text-gray-400 cursor-pointer hover:text-purple-500 p-1.5 -m-1.5 rounded hover:bg-purple-50 transition-all"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.open(task.resourceUrl, '_blank');
                                                                    }}
                                                                    title={task.resourceUrl}
                                                                >
                                                                    <Paperclip className="w-4 h-3" />
                                                                </div>
                                                            )}
                                                            {task.notes && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-center text-gray-400 cursor-pointer hover:text-gray-600 p-1.5 -m-1.5 rounded hover:bg-gray-100 transition-all">
                                                                            <FileText className="w-4 h-3" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" className="max-w-[250px] bg-gray-800 text-white border-gray-700">
                                                                        <p className="whitespace-pre-wrap text-sm">{task.notes.length > 100 ? task.notes.slice(0, 100) + '...' : task.notes}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => setDeleteTaskToConfirm(task)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Empty State */}
                        {tasks.length === 0 && (
                            <motion.div
                                className="text-center py-12 text-gray-400"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="text-4xl mb-3">📝</div>
                                <p>할 일을 추가해보세요!</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Task Detail Dialog */}
            <TaskDetailDialog
                task={detailTask}
                isOpen={!!detailTask}
                onClose={() => setDetailTask(null)}
                onTaskChange={onTasksChange}
                onSortByDate={handleSortByDate}
            />

            {/* Delete Confirmation Dialog for Completed Tasks */}
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
                                    onTasksChange();
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

