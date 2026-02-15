'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TeamMember } from '@/lib/types';
import { getTeamMembers, saveTeamMembers, deleteTeamMember } from '@/lib/storage';
import { parseHRText, mergeTeamMembers } from '@/lib/hr-parser';
import { TeamMemberModal } from './team-member-modal';
import {
    Search,
    Users,
    Trash2,
    ArrowUpDown,
    ClipboardPaste,
    X,
    Settings2,
    Eye,
    EyeOff,
} from 'lucide-react';

interface TeamMemberBoardProps {
    onDataChange?: () => void;
}

type SortField = 'name' | 'position' | 'department' | 'group' | 'part' | 'workLocation' | 'positionYear' | 'birthYear' | 'knoxId' | 'employeeId' | 'status';
type SortOrder = 'asc' | 'desc';

// Column definitions
interface ColumnDef {
    key: string;
    label: string;
    sortField?: SortField;
    render: (member: TeamMember) => React.ReactNode;
    className?: string;
    defaultVisible: boolean;
}

const COLUMN_STORAGE_KEY = 'team-member-visible-columns';

function getStoredColumns(): string[] | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(COLUMN_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
}

function saveStoredColumns(keys: string[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(keys));
}

export function TeamMemberBoard({ onDataChange }: TeamMemberBoardProps) {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterProcess, setFilterProcess] = useState<string>('all');
    const [filterLocation, setFilterLocation] = useState<string>('all');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');
    const [filterPosition, setFilterPosition] = useState<string>('all');
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [importToast, setImportToast] = useState<string | null>(null);

    // Custom Columns State (Persisted)
    const [customColumns, setCustomColumns] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem('team-member-custom-columns');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('team-member-custom-columns', JSON.stringify(customColumns));
        }
    }, [customColumns]);
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const dragColumnRef = useRef<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    // Phase 7: Import Confirmation
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [pendingImportMembers, setPendingImportMembers] = useState<TeamMember[]>([]);
    const [pendingImportStats, setPendingImportStats] = useState<{ total: number, customHeaders: string[] } | null>(null);

    const getPositionColor = (position: string) => {
        switch (position) {
            case 'CL4': return 'text-purple-700 dark:text-purple-300';
            case 'CL3': return 'text-blue-700 dark:text-blue-300';
            case 'CL2': return 'text-green-700 dark:text-green-300';
            case 'CL1': return 'text-gray-700 dark:text-gray-300';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case '휴직': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
            case '퇴직': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
            case '주재원': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
            default: return '';
        }
    };

    // Column definitions
    const columns: ColumnDef[] = [
        {
            key: 'name', label: '이름', sortField: 'name', defaultVisible: true,
            render: (m) => <span className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{m.name}</span>,
        },
        {
            key: 'position', label: '직급', sortField: 'position', defaultVisible: true,
            render: (m) => <span className={`font-semibold whitespace-nowrap ${getPositionColor(m.position)}`}>{m.position}</span>,
        },
        {
            key: 'positionYear', label: '연차', sortField: 'positionYear', defaultVisible: true,
            render: (m) => <span className="text-gray-600 dark:text-gray-400">{m.positionYear || '-'}</span>,
            className: 'text-center',
        },
        {
            key: 'department', label: '소속', sortField: 'department', defaultVisible: true,
            render: (m) => <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{m.department}</span>,
        },
        {
            key: 'group', label: '그룹', sortField: 'group', defaultVisible: true,
            render: (m) => <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{m.group}</span>,
        },
        {
            key: 'part', label: '파트', sortField: 'part', defaultVisible: true,
            render: (m) => <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{m.part}</span>,
        },
        {
            key: 'workLocation', label: '근무지', sortField: 'workLocation', defaultVisible: true,
            render: (m) => <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{m.workLocation}</span>,
        },
        {
            key: 'birthYear', label: '출생년도', sortField: 'birthYear', defaultVisible: false,
            render: (m) => <span className="text-gray-600 dark:text-gray-400">{m.birthYear || '-'}</span>,
        },
        {
            key: 'knoxId', label: 'Knox ID', sortField: 'knoxId', defaultVisible: true,
            render: (m) => <span className="text-xs text-gray-500 dark:text-gray-500 font-mono">{m.knoxId}</span>,
        },
        {
            key: 'employeeId', label: '사번', sortField: 'employeeId', defaultVisible: false,
            render: (m) => <span className="text-xs text-gray-500 dark:text-gray-500 font-mono">{m.employeeId}</span>,
        },
        {
            key: 'status', label: '상태', sortField: 'status', defaultVisible: true,
            render: (m) => m.status !== '재직' ? (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(m.status)}`}>{m.status}</span>
            ) : null,
        },
    ];

    // Merge static columns with custom columns
    const allColumns: ColumnDef[] = [
        ...columns,
        ...customColumns.map(key => ({
            key,
            label: key, // Use key as label for custom columns
            sortField: key as SortField,
            defaultVisible: true,
            render: (m: TeamMember) => <span className="text-gray-600 dark:text-gray-400 text-xs">{m.customFields?.[key] || '-'}</span>,
        }))
    ];

    // Column visibility state
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const stored = getStoredColumns();
        // If stored, filter to ensure keys still exist (or allow them if they are custom)
        // Check against allColumns keys
        if (stored) return stored;
        return allColumns.filter(c => c.defaultVisible).map(c => c.key);
    });

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => {
            const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
            saveStoredColumns(next);
            return next;
        });
    };

    // Derive activeColumns from visibleColumns order
    const columnsMap = new Map(allColumns.map(c => [c.key, c]));
    const activeColumns = visibleColumns.map(k => columnsMap.get(k)!).filter(Boolean);

    // DnD handlers for column reorder
    const handleColumnDragStart = (key: string) => {
        dragColumnRef.current = key;
    };

    const handleColumnDragOver = (e: React.DragEvent, key: string) => {
        e.preventDefault();
        if (dragColumnRef.current && dragColumnRef.current !== key) {
            setDragOverColumn(key);
        }
    };

    const handleColumnDrop = (targetKey: string) => {
        const sourceKey = dragColumnRef.current;
        if (!sourceKey || sourceKey === targetKey) {
            dragColumnRef.current = null;
            setDragOverColumn(null);
            return;
        }
        setVisibleColumns(prev => {
            const next = [...prev];
            const srcIdx = next.indexOf(sourceKey);
            const tgtIdx = next.indexOf(targetKey);
            if (srcIdx === -1 || tgtIdx === -1) return prev;
            next.splice(srcIdx, 1);
            next.splice(tgtIdx, 0, sourceKey);
            saveStoredColumns(next);
            return next;
        });
        dragColumnRef.current = null;
        setDragOverColumn(null);
    };

    const handleColumnDragEnd = () => {
        dragColumnRef.current = null;
        setDragOverColumn(null);
    };

    useEffect(() => {
        // Load and migrate: ensure all members use knoxId as their id
        let members = getTeamMembers();
        let needsSave = false;

        members = members.map(m => {
            if (m.knoxId && m.id !== m.knoxId) {
                needsSave = true;
                return { ...m, id: m.knoxId };
            }
            return m;
        });

        // Deduplicate by knoxId
        const seen = new Map<string, typeof members[0]>();
        for (const m of members) {
            const key = m.knoxId || m.id;
            const existing = seen.get(key);
            if (!existing || m.updatedAt > existing.updatedAt) {
                seen.set(key, m);
                if (existing) needsSave = true;
            } else {
                needsSave = true;
            }
        }
        members = Array.from(seen.values());

        if (needsSave) saveTeamMembers(members);
        setMembers(members);
    }, []);

    // Ctrl+Shift+V: Clipboard auto-import
    const handleClipboardImport = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                setImportToast('❌ 클립보드가 비어있습니다.');
                setTimeout(() => setImportToast(null), 3000);
                return;
            }

            const parseResult = parseHRText(text);
            if (parseResult.members.length === 0) {
                setImportToast('❌ 인사정보를 파싱할 수 없습니다. 형식을 확인해주세요.');
                setTimeout(() => setImportToast(null), 3000);
                return;
            }

            // Phase 7: Verification Dialog
            setPendingImportMembers(parseResult.members);
            setPendingImportStats({
                total: parseResult.members.length,
                customHeaders: parseResult.customHeaders
            });
            setShowImportConfirm(true);

        } catch (err) {
            console.error('클립보드 읽기 실패:', err);
            setImportToast('❌ 클립보드를 읽을 수 없습니다. 브라우저 권한을 확인해주세요.');
            setTimeout(() => setImportToast(null), 3000);
        }
    }, [onDataChange]);

    const confirmImport = (mode: 'overwrite' | 'merge') => {
        if (!pendingImportMembers.length) return;

        let finalMembers: TeamMember[] = [];
        let msg = '';

        if (mode === 'overwrite') {
            // Delete All & Add New
            finalMembers = pendingImportMembers;
            msg = `✅ 전체 덮어쓰기 완료: 총 ${finalMembers.length}명`;

            // Overwrite custom columns: Replace with new headers
            const newHeaders = pendingImportStats?.customHeaders || [];
            setCustomColumns(newHeaders);

            // Auto-update visibility to show new columns
            const staticKeys = columns.map(c => c.key);
            const newVisible = [...staticKeys.filter(k => k !== 'employeeId' && k !== 'birthYear'), ...newHeaders];
            setVisibleColumns(newVisible);
            saveStoredColumns(newVisible);

        } else {
            // Merge (Keep Existing & Update)
            const existing = getTeamMembers();
            const { merged, added, updated, unchanged } = mergeTeamMembers(existing, pendingImportMembers);
            finalMembers = merged;
            msg = `✅ 병합 완료: 총 ${merged.length}명 (추가: ${added}, 갱신: ${updated}, 유지: ${unchanged})`;

            // Merge custom columns: Add new headers if not exists
            const newHeaders = pendingImportStats?.customHeaders || [];
            if (newHeaders.length > 0) {
                setCustomColumns(prev => {
                    const next = [...prev];
                    newHeaders.forEach(h => {
                        if (!next.includes(h)) next.push(h);
                    });
                    return next;
                });

                // Auto-show new columns
                setVisibleColumns(prev => {
                    const next = [...prev];
                    newHeaders.forEach(h => {
                        if (!next.includes(h)) next.push(h);
                    });
                    saveStoredColumns(next);
                    return next;
                });
            }
        }

        if (pendingImportStats?.customHeaders.length) {
            msg += `\n📋 추가 컬럼: ${pendingImportStats.customHeaders.join(', ')}`;
        }

        saveTeamMembers(finalMembers);
        setMembers(finalMembers);

        setImportToast(msg);
        setTimeout(() => setImportToast(null), 5000);
        onDataChange?.();

        // Cleanup
        setShowImportConfirm(false);
        setPendingImportMembers([]);
        setPendingImportStats(null);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                handleClipboardImport();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleClipboardImport]);

    // Unique values for filters
    const uniqueProcesses = [...new Set(members.map(m => m.group).filter(Boolean))].sort();
    const uniqueLocations = [...new Set(members.map(m => m.workLocation).filter(Boolean))].sort();
    const uniqueDepartments = [...new Set(members.map(m => m.department).filter(Boolean))].sort();
    const uniquePositions = [...new Set(members.map(m => m.position).filter(Boolean))].sort();

    // Filter and search
    const filteredMembers = members.filter(m => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            m.name.toLowerCase().includes(q) ||
            m.knoxId.toLowerCase().includes(q) ||
            m.employeeId.toLowerCase().includes(q) ||
            m.department.toLowerCase().includes(q) ||
            m.group.toLowerCase().includes(q) ||
            m.part.toLowerCase().includes(q) ||
            m.position.toLowerCase().includes(q) ||
            m.workLocation.toLowerCase().includes(q);

        const matchesProcess = filterProcess === 'all' || m.group === filterProcess;
        const matchesLocation = filterLocation === 'all' || m.workLocation === filterLocation;
        const matchesDepartment = filterDepartment === 'all' || m.department === filterDepartment;
        const matchesPosition = filterPosition === 'all' || m.position === filterPosition;

        return matchesSearch && matchesProcess && matchesLocation && matchesDepartment && matchesPosition;
    });

    // Sort
    const sortedMembers = [...filteredMembers].sort((a, b) => {
        let aVal: string | number = (a as any)[sortField] ?? '';
        let bVal: string | number = (b as any)[sortField] ?? '';
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleDeleteMember = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('이 팀원을 삭제하시겠습니까?')) {
            deleteTeamMember(id);
            setMembers(getTeamMembers());
            onDataChange?.();
        }
    };

    const handleMemberUpdate = () => {
        setMembers(getTeamMembers());
        onDataChange?.();
    };

    const activeFilters = [filterProcess, filterLocation, filterDepartment, filterPosition].filter(f => f !== 'all').length;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">팀원 관리</h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({sortedMembers.length}/{members.length}명)
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Column Settings */}
                        <div className="relative">
                            <button
                                onClick={() => setShowColumnSettings(!showColumnSettings)}
                                className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${showColumnSettings
                                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                <span>컬럼 설정</span>
                            </button>

                            {showColumnSettings && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={() => setShowColumnSettings(false)} />
                                    <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]">
                                        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">표시할 컬럼</div>
                                        {columns.map(col => (
                                            <button
                                                key={col.key}
                                                onClick={() => toggleColumn(col.key)}
                                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {visibleColumns.includes(col.key) ? (
                                                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                                                ) : (
                                                    <EyeOff className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                                                )}
                                                <span className={visibleColumns.includes(col.key) ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>
                                                    {col.label}
                                                </span>
                                            </button>
                                        ))}
                                        <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1 px-3 pb-1">
                                            <button
                                                onClick={() => {
                                                    const defaults = columns.filter(c => c.defaultVisible).map(c => c.key);
                                                    setVisibleColumns(defaults);
                                                    saveStoredColumns(defaults);
                                                }}
                                                className="text-[10px] text-blue-500 hover:text-blue-700"
                                            >
                                                기본값으로 초기화
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <ClipboardPaste className="w-3.5 h-3.5" />
                            <span>Ctrl+Shift+V: 가져오기</span>
                        </div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="이름, Knox ID, 소속, 공정, 근무지 검색..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                        />
                    </div>
                    <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                        <option value="all">전체 소속</option>
                        {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filterProcess} onChange={e => setFilterProcess(e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                        <option value="all">전체 공정</option>
                        {uniqueProcesses.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={filterPosition} onChange={e => setFilterPosition(e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                        <option value="all">전체 직급</option>
                        {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                        <option value="all">전체 근무지</option>
                        {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    {activeFilters > 0 && (
                        <button
                            onClick={() => { setFilterProcess('all'); setFilterLocation('all'); setFilterDepartment('all'); setFilterPosition('all'); }}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-2 whitespace-nowrap"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Import Toast */}
            {importToast && (
                <div className="flex-shrink-0 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">{importToast}</p>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {sortedMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Users className="w-12 h-12 mb-3" />
                        {members.length === 0 ? (
                            <>
                                <p className="text-lg font-medium">팀원 정보가 없습니다</p>
                                <p className="text-sm mt-1">인트라넷에서 Ctrl+A → Ctrl+C 후</p>
                                <p className="text-sm"><strong>Ctrl+Shift+V</strong>로 가져오세요</p>
                            </>
                        ) : (
                            <p className="text-lg font-medium">검색 결과가 없습니다</p>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 w-10">#</th>
                                {activeColumns.map(col => (
                                    <th
                                        key={col.key}
                                        draggable
                                        onDragStart={() => handleColumnDragStart(col.key)}
                                        onDragOver={(e) => handleColumnDragOver(e, col.key)}
                                        onDrop={() => handleColumnDrop(col.key)}
                                        onDragEnd={handleColumnDragEnd}
                                        className={`px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap select-none transition-all ${col.sortField ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : 'cursor-grab'
                                            } ${col.className || ''} ${dragOverColumn === col.key ? 'border-l-2 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : ''
                                            }`}
                                        onClick={() => col.sortField && handleSort(col.sortField)}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {col.sortField && sortField === col.sortField && (
                                                <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                                            )}
                                        </div>
                                    </th>
                                ))}
                                <th className="px-3 py-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMembers.map((member, idx) => (
                                <tr
                                    key={`${member.id}-${idx}`}
                                    onClick={() => { setSelectedMember(member); setIsModalOpen(true); }}
                                    className={`group border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${member.status === '휴직' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' :
                                        member.status === '주재원' ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''
                                        }`}
                                >
                                    <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                                    {activeColumns.map(col => (
                                        <td key={col.key} className={`px-3 py-2 ${col.className || ''}`}>
                                            {col.render(member)}
                                        </td>
                                    ))}
                                    <td className="px-3 py-2">
                                        <button
                                            onClick={e => handleDeleteMember(e, member.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Member Detail Modal */}
            {isModalOpen && selectedMember && (
                <TeamMemberModal
                    member={selectedMember}
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedMember(null); }}
                    onUpdate={handleMemberUpdate}
                />
            )}
            {/* Import Confirmation Dialog */}
            {showImportConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                <ClipboardPaste className="w-5 h-5 text-blue-500" />
                                팀원 정보 가져오기
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                                클립보드에서 <strong>{pendingImportStats?.total}명</strong>의 팀원 정보를 감지했습니다.<br />
                                데이터를 어떻게 처리하시겠습니까?
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => confirmImport('overwrite')}
                                    className="w-full flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:hover:bg-red-900/20 transition-all group"
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-red-700 dark:text-red-400 mb-0.5">덮어쓰기 (전체 삭제 후 추가)</div>
                                        <div className="text-xs text-red-600/70 dark:text-red-400/70">기존 데이터를 모두 삭제하고 새로운 데이터로 교체합니다.</div>
                                    </div>
                                    <Trash2 className="w-5 h-5 text-red-400 group-hover:text-red-600 dark:text-red-500/50 dark:group-hover:text-red-400" />
                                </button>

                                <button
                                    onClick={() => confirmImport('merge')}
                                    className="w-full flex items-center justify-between p-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 transition-all group"
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-blue-700 dark:text-blue-400 mb-0.5">추가하기 (유지 및 병합)</div>
                                        <div className="text-xs text-blue-600/70 dark:text-blue-400/70">기존 데이터를 유지하고 새로운 데이터를 추가/갱신합니다.</div>
                                    </div>
                                    <Users className="w-5 h-5 text-blue-400 group-hover:text-blue-600 dark:text-blue-500/50 dark:group-hover:text-blue-400" />
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 flex justify-end">
                            <button
                                onClick={() => { setShowImportConfirm(false); setPendingImportMembers([]); }}
                                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
