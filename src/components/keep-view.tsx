"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Note, NOTE_COLORS, Label } from '@/lib/types';
import { getNotes, addNote, updateNote, deleteNote, getLabels, addLabel, updateLabel, deleteLabel } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pin, Trash2, Palette, X, Archive, Search, Tag, Settings, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface KeepViewProps {
    selectedNoteId?: string | null;
    onNoteSelected?: () => void;
    onNotesChange?: () => void;
}

export function KeepView({ selectedNoteId, onNoteSelected, onNotesChange }: KeepViewProps = {}) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newNoteLabels, setNewNoteLabels] = useState<string[]>([]);

    const [isAdding, setIsAdding] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    // Label Manager State
    const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [editingLabelName, setEditingLabelName] = useState('');
    const [newLabelName, setNewLabelName] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadNotes();
        loadLabels();
    }, []);

    const loadLabels = () => {
        setLabels(getLabels());
    };

    // Open edit dialog when selectedNoteId is provided (from sidebar pinned memo click)
    useEffect(() => {
        if (selectedNoteId && notes.length > 0) {
            const noteToEdit = notes.find(n => n.id === selectedNoteId);
            if (noteToEdit) {
                setEditingNote(noteToEdit);
                onNoteSelected?.();
            }
        }
    }, [selectedNoteId, notes, onNoteSelected]);

    // Focus title input when isAdding becomes true
    useEffect(() => {
        if (isAdding && inputRef.current) {
            // Use setTimeout to ensure the input is rendered first
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        } else if (!isAdding) {
            setNewNoteLabels([]); // Reset labels when closing add form
        }
    }, [isAdding]);

    // Keyboard shortcuts: Ctrl+N to add new note, Ctrl+/ to search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if dialog is open
            if (editingNote || isLabelManagerOpen) return;

            // Skip if user is typing in an input field
            const activeElement = document.activeElement;
            const isInputFocused = activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement;
            if (isInputFocused) return;

            // M: Focus on new note input (memo)
            if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                setIsAdding(true);
                // Focus will be handled by autoFocus on the input
            }

            // Ctrl+/: Focus on search input
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingNote, isLabelManagerOpen]);

    const loadNotes = () => {
        setNotes(getNotes());
    };

    const handleAddNote = () => {
        if (newTitle.trim() || newContent.trim()) {
            const note = addNote(newTitle.trim() || '제목 없음', newContent.trim());
            if (newNoteLabels.length > 0) {
                updateNote(note.id, { labels: newNoteLabels });
            }
            setNewTitle('');
            setNewContent('');
            setNewNoteLabels([]);
            setIsAdding(false);
            loadNotes();
            onNotesChange?.();
        }
    };

    // Handle keyboard in add note form
    const handleAddFormKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl+Enter: Save the note
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleAddNote();
        }
        // Escape: Cancel adding
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsAdding(false);
            setNewTitle('');
            setNewContent('');
            setNewNoteLabels([]);
        }
    };

    const handleUpdateNote = () => {
        if (editingNote) {
            updateNote(editingNote.id, {
                title: editingNote.title,
                content: editingNote.content,
                color: editingNote.color,
                labels: editingNote.labels,
            });
            setEditingNote(null);
            loadNotes();
            onNotesChange?.();
        }
    };

    // Handle keyboard in edit dialog
    const handleEditDialogKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl+Enter: Save and close the note
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleUpdateNote();
        }
    };

    const handleTogglePin = (note: Note) => {
        updateNote(note.id, { isPinned: !note.isPinned });
        loadNotes();
        onNotesChange?.();
    };

    const handleToggleArchive = (note: Note) => {
        updateNote(note.id, { isArchived: !note.isArchived });
        loadNotes();
        onNotesChange?.();
    };

    const handleChangeColor = (note: Note, color: string) => {
        updateNote(note.id, { color });
        loadNotes();
    };

    const handleDelete = (id: string) => {
        deleteNote(id);
        loadNotes();
        onNotesChange?.();
    };

    // Label Management Functions
    const handleAddLabel = () => {
        if (newLabelName.trim()) {
            addLabel(newLabelName.trim());
            setNewLabelName('');
            loadLabels();
        }
    };

    const handleUpdateLabel = (id: string) => {
        if (editingLabelName.trim()) {
            updateLabel(id, editingLabelName.trim());
            setEditingLabelId(null);
            setEditingLabelName('');
            loadLabels();
            loadNotes(); // Refresh notes to reflect label name changes if we store names (we store IDs, but UI update needed)
        }
    };

    const handleDeleteLabel = (id: string) => {
        if (window.confirm('이 라벨을 삭제하시겠습니까?')) {
            deleteLabel(id);
            if (selectedLabelId === id) setSelectedLabelId(null);
            loadLabels();
            loadNotes();
        }
    };

    const toggleLabelOnNote = (labelId: string) => {
        if (editingNote) {
            const currentLabels = editingNote.labels || [];
            const newLabels = currentLabels.includes(labelId)
                ? currentLabels.filter(id => id !== labelId)
                : [...currentLabels, labelId];
            setEditingNote({ ...editingNote, labels: newLabels });
        } else if (isAdding) {
            const newLabels = newNoteLabels.includes(labelId)
                ? newNoteLabels.filter(id => id !== labelId)
                : [...newNoteLabels, labelId];
            setNewNoteLabels(newLabels);
        }
    };

    // Filter notes
    const filteredNotes = notes.filter(note => {
        // Filter by archive status
        if (showArchived !== note.isArchived) return false;

        // Filter by label
        if (selectedLabelId) {
            if (!note.labels?.includes(selectedLabelId)) return false;
        }

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query);
        }
        return true;
    });

    const pinnedNotes = filteredNotes.filter(n => n.isPinned);
    const otherNotes = filteredNotes.filter(n => !n.isPinned);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        📝 메모
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="검색... (Ctrl+/)"
                                className="h-8 w-32 pl-8 text-sm"
                            />
                        </div>
                        {/* Archive Toggle */}
                        <Button
                            variant={showArchived ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowArchived(!showArchived)}
                            className={showArchived ? 'bg-gray-600' : ''}
                        >
                            <Archive className="w-4 h-4 mr-1" />
                            보관함
                        </Button>
                    </div>
                </div>

                {/* Label Filter Bar */}
                {labels.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-500 hover:text-gray-900"
                            onClick={() => setIsLabelManagerOpen(true)}
                        >
                            <Settings className="w-3 h-3 mr-1" />
                            라벨 관리
                        </Button>
                        <div className="h-4 w-px bg-gray-300 mx-1 flex-shrink-0" />
                        <Button
                            variant={selectedLabelId === null ? "secondary" : "ghost"}
                            size="sm"
                            className="text-xs rounded-full h-7 px-3 flex-shrink-0"
                            onClick={() => setSelectedLabelId(null)}
                        >
                            전체
                        </Button>
                        {labels.map(label => (
                            <Button
                                key={label.id}
                                variant={selectedLabelId === label.id ? "secondary" : "outline"}
                                size="sm"
                                className={`text-xs rounded-full h-7 px-3 flex-shrink-0 border-gray-200 ${selectedLabelId === label.id ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' : 'text-gray-600'}`}
                                onClick={() => setSelectedLabelId(selectedLabelId === label.id ? null : label.id)}
                            >
                                <Tag className="w-3 h-3 mr-1" />
                                {label.name}
                            </Button>
                        ))}
                    </div>
                )}
                {labels.length === 0 && (
                    <div className="mb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-blue-500 hover:text-blue-700 p-0 h-auto"
                            onClick={() => setIsLabelManagerOpen(true)}
                        >
                            + 라벨 추가하기
                        </Button>
                    </div>
                )}

                {/* Add New Note */}
                {!showArchived && (
                    <div
                        className={`border rounded-lg bg-white dark:bg-gray-700 shadow-sm transition-all ${isAdding ? 'p-3' : 'p-2'}`}
                        onClick={() => !isAdding && setIsAdding(true)}
                    >
                        {isAdding ? (
                            <div className="space-y-2" onKeyDown={handleAddFormKeyDown}>
                                <Input
                                    ref={inputRef}
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="제목"
                                    className="border-0 p-0 text-sm font-medium focus-visible:ring-0"
                                    autoFocus
                                    tabIndex={1}
                                />
                                <Textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="메모 작성... (Ctrl+Enter로 저장)"
                                    className="border-0 p-0 text-sm resize-none min-h-[60px] focus-visible:ring-0"
                                    tabIndex={2}
                                />
                                {/* Label Selection in Add Form */}
                                {labels.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {newNoteLabels.map(labelId => {
                                            const label = labels.find(l => l.id === labelId);
                                            if (!label) return null;
                                            return (
                                                <span key={labelId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {label.name}
                                                    <button onClick={() => toggleLabelOnNote(labelId)} className="ml-1 text-blue-600 hover:text-blue-800">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500 rounded-full border border-dashed border-gray-300">
                                                    <Plus className="w-3 h-3 mr-1" /> 라벨
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-48 p-2" align="start">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-gray-500 mb-2 px-1">라벨 선택</p>
                                                    {labels.map(label => (
                                                        <div
                                                            key={label.id}
                                                            className={`flex items-center px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-gray-100 ${newNoteLabels.includes(label.id) ? 'bg-blue-50 text-blue-700' : ''}`}
                                                            onClick={() => toggleLabelOnNote(label.id)}
                                                        >
                                                            <Tag className="w-3.5 h-3.5 mr-2" />
                                                            {label.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                                <div className="flex justify-end gap-2 mt-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAdding(false);
                                            setNewTitle('');
                                            setNewContent('');
                                            setNewNoteLabels([]);
                                        }}
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddNote();
                                        }}
                                    >
                                        저장
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-gray-400 cursor-text">
                                <Plus className="w-4 h-4" />
                                <span className="text-sm">메모 작성...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Notes Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* Pinned Section */}
                {pinnedNotes.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <Pin className="w-3 h-3" /> 고정됨
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {pinnedNotes.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    labels={labels}
                                    onEdit={() => setEditingNote(note)}
                                    onTogglePin={() => handleTogglePin(note)}
                                    onToggleArchive={() => handleToggleArchive(note)}
                                    onChangeColor={(color) => handleChangeColor(note, color)}
                                    onDelete={() => handleDelete(note.id)}
                                    onLabelClick={(id) => setSelectedLabelId(id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Other Notes */}
                {otherNotes.length > 0 && (
                    <div>
                        {pinnedNotes.length > 0 && (
                            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                기타
                            </h3>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {otherNotes.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    labels={labels}
                                    onEdit={() => setEditingNote(note)}
                                    onTogglePin={() => handleTogglePin(note)}
                                    onToggleArchive={() => handleToggleArchive(note)}
                                    onChangeColor={(color) => handleChangeColor(note, color)}
                                    onDelete={() => handleDelete(note.id)}
                                    onLabelClick={(id) => setSelectedLabelId(id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {filteredNotes.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        {labels.length > 0 && selectedLabelId ? (
                            <>
                                <Tag className="w-12 h-12 mb-2 opacity-20" />
                                <span className="text-sm">이 라벨의 메모가 없습니다</span>
                            </>
                        ) : (
                            <>
                                <span className="text-4xl mb-2">📝</span>
                                <span className="text-sm">
                                    {showArchived ? '보관된 메모가 없습니다' : '메모를 추가해 보세요'}
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingNote} onOpenChange={(open) => !open && handleUpdateNote()}>
                <DialogContent className="sm:max-w-md" onKeyDown={handleEditDialogKeyDown}>
                    <DialogHeader>
                        <DialogTitle>메모 수정 (Ctrl+Enter로 저장)</DialogTitle>
                    </DialogHeader>
                    {editingNote && (
                        <div className="space-y-3">
                            <Input
                                value={editingNote.title}
                                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                                placeholder="제목"
                                className="font-medium"
                            />
                            <Textarea
                                value={editingNote.content}
                                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                                placeholder="메모 내용..."
                                className="min-h-[150px]"
                            />
                            {/* Label Selection in Edit Dialog */}
                            {labels.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {editingNote.labels?.map(labelId => {
                                        const label = labels.find(l => l.id === labelId);
                                        if (!label) return null;
                                        return (
                                            <span key={labelId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {label.name}
                                                <button onClick={() => toggleLabelOnNote(labelId)} className="ml-1 text-blue-600 hover:text-blue-800">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        );
                                    })}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500 rounded-full border border-dashed border-gray-300">
                                                <Plus className="w-3 h-3 mr-1" /> 라벨
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-48 p-2" align="start">
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-gray-500 mb-2 px-1">라벨 선택</p>
                                                {labels.map(label => (
                                                    <div
                                                        key={label.id}
                                                        className={`flex items-center px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-gray-100 ${editingNote.labels?.includes(label.id) ? 'bg-blue-50 text-blue-700' : ''}`}
                                                        onClick={() => toggleLabelOnNote(label.id)}
                                                    >
                                                        <Tag className="w-3.5 h-3.5 mr-2" />
                                                        {label.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}
                            {/* Color Picker */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                                <span className="text-sm text-gray-500">배경색:</span>
                                <div className="flex gap-1">
                                    {NOTE_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${editingNote.color === color.value
                                                ? 'border-blue-500 scale-110'
                                                : 'border-gray-300'
                                                }`}
                                            style={{ backgroundColor: color.value }}
                                            onClick={() => setEditingNote({ ...editingNote, color: color.value })}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Label Manager Dialog */}
            <Dialog open={isLabelManagerOpen} onOpenChange={setIsLabelManagerOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>라벨 관리</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* New Label Input */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="새 라벨 이름"
                                value={newLabelName}
                                onChange={(e) => setNewLabelName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddLabel();
                                }}
                            />
                            <Button onClick={handleAddLabel}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Label List */}
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {labels.map(label => (
                                <div key={label.id} className="flex items-center gap-2 group">
                                    <Tag className="w-4 h-4 text-gray-400" />
                                    {editingLabelId === label.id ? (
                                        <div className="flex-1 flex gap-2">
                                            <Input
                                                value={editingLabelName}
                                                onChange={(e) => setEditingLabelName(e.target.value)}
                                                className="h-8"
                                                autoFocus
                                            />
                                            <Button size="sm" onClick={() => handleUpdateLabel(label.id)}>저장</Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-sm">{label.name}</span>
                                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => {
                                                        setEditingLabelId(label.id);
                                                        setEditingLabelName(label.name);
                                                    }}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDeleteLabel(label.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {labels.length === 0 && (
                                <p className="text-center text-sm text-gray-400 py-4">
                                    등록된 라벨이 없습니다.
                                </p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Note Card Component
function NoteCard({
    note,
    labels,
    onEdit,
    onTogglePin,
    onToggleArchive,
    onChangeColor,
    onDelete,
    onLabelClick,
}: {
    note: Note;
    labels: Label[];
    onEdit: () => void;
    onTogglePin: () => void;
    onToggleArchive: () => void;
    onChangeColor: (color: string) => void;
    onDelete: () => void;
    onLabelClick: (labelId: string) => void;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col"
            style={{ backgroundColor: note.color }}
            onClick={onEdit}
        >
            {/* Content */}
            <div className="p-3 flex-1">
                {note.title && (
                    <h4 className="font-medium text-sm text-gray-800 mb-1 line-clamp-1">
                        {note.title}
                    </h4>
                )}
                {note.content && (
                    <p className="text-xs text-gray-600 line-clamp-4 whitespace-pre-wrap">
                        {note.content}
                    </p>
                )}

                {/* Labels Chips */}
                {note.labels && note.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {note.labels.map(labelId => {
                            const label = labels.find(l => l.id === labelId);
                            if (!label) return null;
                            return (
                                <span
                                    key={labelId}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-black/5 hover:bg-black/10 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLabelClick(labelId);
                                    }}
                                >
                                    {label.name}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Actions - show on hover */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 ${note.isPinned ? 'opacity-100 text-blue-600' : 'hover:bg-gray-200/50'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin();
                    }}
                    title={note.isPinned ? '고정 해제' : '고정'}
                >
                    <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
                </Button>

                {/* Color Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-gray-200/50"
                            onClick={(e) => e.stopPropagation()}
                            title="색상 변경"
                        >
                            <Palette className="w-3.5 h-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="end">
                        <div className="flex gap-1">
                            {NOTE_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${note.color === color.value ? 'border-blue-500' : 'border-gray-200'
                                        }`}
                                    style={{ backgroundColor: color.value }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChangeColor(color.value);
                                    }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-gray-200/50"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleArchive();
                    }}
                    title={note.isArchived ? '보관 해제' : '보관'}
                >
                    <Archive className="w-3.5 h-3.5" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    title="삭제"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Pin indicator */}
            {note.isPinned && (
                <div className="absolute top-1 left-1">
                    <Pin className="w-3 h-3 text-blue-600 fill-current" />
                </div>
            )}
        </motion.div>
    );
}
