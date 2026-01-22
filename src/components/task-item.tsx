"use client";

import React, { useState } from 'react';
import { Task } from '@/lib/types';
import { updateTask, deleteTask, toggleTaskComplete } from '@/lib/storage';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
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
import { MoreVertical, Trash2, Calendar, FileText, GripVertical, Star } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskItemProps {
    task: Task;
    onTaskChange: () => void;
    onOpenDetail: (task: Task) => void;
    isDragging?: boolean;
    dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function TaskItem({
    task,
    onTaskChange,
    onOpenDetail,
    isDragging,
    dragHandleProps,
}: TaskItemProps) {
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

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateTask(task.id, { isFavorite: !task.isFavorite });
        onTaskChange();
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
            <div
                className={`group flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-all ${isDragging ? 'shadow-lg ring-2 ring-blue-200' : ''
                    } ${task.completed ? 'opacity-60' : ''}`}
            >
                {/* Drag Handle */}
                <div
                    {...dragHandleProps}
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-0.5"
                >
                    <GripVertical className="w-4 h-4" />
                </div>

                {/* Checkbox */}
                <Checkbox
                    checked={task.completed}
                    onCheckedChange={handleToggle}
                    className="mt-0.5 h-5 w-5 rounded-full border-2 data-[state=checked]:!bg-gray-400 data-[state=checked]:!border-gray-400"
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
                            className={`text-sm cursor-pointer ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'
                                }`}
                            onClick={() => onOpenDetail(task)}
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
                        {task.notes && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <FileText className="w-3 h-3" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 opacity-0 group-hover:opacity-100 ${task.isFavorite ? 'opacity-100 text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                            onClick={handleToggleFavorite}
                            title={task.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        >
                            <Star className={`h-4 w-4 ${task.isFavorite ? 'fill-yellow-500' : ''}`} />
                        </Button>
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
            </div>

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

