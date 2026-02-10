'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BusinessTrip, TeamMember } from '@/lib/types';
import { getBusinessTrips, saveBusinessTrips, deleteBusinessTrip, getTeamMembers } from '@/lib/storage';
import { parseTripText } from '@/lib/trip-parser';
import {
    Search,
    Plane,
    Calendar,
    Trash2,
    ArrowUpDown,
    ClipboardPaste,
    AlertCircle,
} from 'lucide-react';

interface TripBoardProps {
    onDataChange?: () => void;
}

type SortField = 'name' | 'startDate' | 'endDate' | 'location' | 'purpose' | 'status';
type SortOrder = 'asc' | 'desc';

export function TripBoard({ onDataChange }: TripBoardProps) {
    const [trips, setTrips] = useState<BusinessTrip[]>([]);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all'); // all, active, planned, completed
    const [sortField, setSortField] = useState<SortField>('startDate');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [importToast, setImportToast] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
    const [ganttStartDate, setGanttStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [ganttEndDate, setGanttEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 35);
        return d.toISOString().split('T')[0];
    });

    useEffect(() => {
        setTrips(getBusinessTrips());
        setMembers(getTeamMembers()); // Ensure members are loaded
    }, []);

    const getStatus = (trip: BusinessTrip): 'active' | 'planned' | 'completed' => {
        const now = new Date();
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);

        if (now > end) return 'completed';
        return 'active';
    };

    // Derived state for display
    const tripsWithStatus = trips.map(t => ({
        ...t,
        derivedStatus: getStatus(t)
    }));

    // Scroll Sync Refs
    const headerRef = React.useRef<HTMLDivElement>(null);
    const bodyRef = React.useRef<HTMLDivElement>(null);

    const handleBodyScroll = useCallback(() => {
        if (headerRef.current && bodyRef.current) {
            headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
        }
    }, []);

    // Zoom (Day Width)
    const [dayWidth, setDayWidth] = useState(40);
    const MIN_DAY_WIDTH = 20;
    const MAX_DAY_WIDTH = 100;

    // Today Color Option
    type TodayColor = 'yellow' | 'green' | 'blue' | 'purple' | 'red';
    const [todayColor, setTodayColor] = useState<TodayColor>('yellow');

    // UseRef for Gantt Container to attach passive: false listener
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle Wheel Zoom with native listener for { passive: false } support
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Check for Alt key to activate zoom
            if (e.altKey) {
                e.preventDefault(); // Prevent default vertical scroll
                e.stopPropagation();

                // Wheel Down (positive) -> Zoom In (width increase)
                // Wheel Up (negative) -> Zoom Out (width decrease)
                const zoomDelta = e.deltaY > 0 ? 5 : -5;
                setDayWidth(prev => Math.max(MIN_DAY_WIDTH, Math.min(MAX_DAY_WIDTH, prev + zoomDelta)));
            }
        };

        // Add listener with passive: false to allow preventDefault()
        // We need to attach it to the element if it exists.
        // Since the element might be null initially (if viewMode is list), we need to retry or depend on viewMode.
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, [viewMode]); // Re-run when viewMode changes to 'gantt'

    const getTodayColorClass = (color: TodayColor, isHeader: boolean) => {
        // Opacity adjustment for header vs body
        const baseOpacity = isHeader ? '20' : '10'; // % opacity

        switch (color) {
            case 'yellow': return isHeader ? 'bg-yellow-100 dark:bg-yellow-900/30 font-bold' : 'bg-yellow-50/50 dark:bg-yellow-900/10';
            case 'green': return isHeader ? 'bg-green-100 dark:bg-green-900/30 font-bold' : 'bg-green-50/50 dark:bg-green-900/10';
            case 'blue': return isHeader ? 'bg-blue-100 dark:bg-blue-900/30 font-bold' : 'bg-blue-50/50 dark:bg-blue-900/10';
            case 'purple': return isHeader ? 'bg-purple-100 dark:bg-purple-900/30 font-bold' : 'bg-purple-50/50 dark:bg-purple-900/10';
            case 'red': return isHeader ? 'bg-red-100 dark:bg-red-900/30 font-bold' : 'bg-red-50/50 dark:bg-red-900/10';
            default: return '';
        }
    };

    // Helper for Gantt
    const getDatesInRange = (startStr: string, endStr: string) => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const dates: Date[] = [];
        let current = new Date(start);
        while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    const dates = getDatesInRange(ganttStartDate, ganttEndDate);
    // dayWidth is now state managed above

    // Group trips by member for Gantt
    // Map Member -> Trips
    // Also include trips for unknown members (under 'Unmatched')
    const tripsByMember = new Map<string, BusinessTrip[]>();
    // Pre-fill with all team members to show empty rows
    members.forEach(m => tripsByMember.set(m.knoxId, []));

    // Add trips
    const unmatchedTrips: BusinessTrip[] = [];
    trips.forEach(t => {
        if (t.knoxId) {
            const memberTrips = tripsByMember.get(t.knoxId);
            if (memberTrips) {
                memberTrips.push(t);
            } else {
                // KnoxID exists in trip but not in members list? Should not happen if data integrity kept
                unmatchedTrips.push(t);
            }
        } else {
            // Try to match by name if knoxId missing (legacy or import issue)
            const match = members.find(m => m.name === t.name);
            if (match) {
                const memberTrips = tripsByMember.get(match.knoxId);
                memberTrips?.push(t);
            } else {
                unmatchedTrips.push(t);
            }
        }
    });

    // Ctrl+Shift+V: Clipboard auto-import
    const handleClipboardImport = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                setImportToast('❌ 클립보드가 비어있습니다.');
                setTimeout(() => setImportToast(null), 3000);
                return;
            }

            const existingMembers = getTeamMembers(); // Refresh members
            const { trips: parsedTrips, unknownNames } = parseTripText(text, existingMembers);

            if (parsedTrips.length === 0) {
                setImportToast('❌ 출장 정보를 파싱할 수 없습니다. 형식을 확인해주세요.');
                setTimeout(() => setImportToast(null), 3000);
                return;
            }

            // Merge logic: Add new trips, skip exact duplicates
            const existingTrips = getBusinessTrips();
            const merged = [...existingTrips];
            let added = 0;

            for (const newTrip of parsedTrips) {
                // Check duplicate: Same Name + StartDate + EndDate
                const exists = existingTrips.some(et =>
                    et.name === newTrip.name &&
                    et.startDate === newTrip.startDate &&
                    et.endDate === newTrip.endDate
                );

                if (!exists) {
                    merged.push(newTrip);
                    added++;
                }
            }

            saveBusinessTrips(merged);
            setTrips(merged);
            setMembers(existingMembers);

            let msg = `✅ ${added}건의 출장이 추가되었습니다.`;
            if (unknownNames.length > 0) {
                msg += `\n⚠️ 매칭되지 않은 이름: ${unknownNames.length}명 (${unknownNames.slice(0, 3).join(', ')}...)`;
            }
            setImportToast(msg);
            setTimeout(() => setImportToast(null), 5000);
            onDataChange?.();
        } catch (err) {
            console.error('클립보드 읽기 실패:', err);
            setImportToast('❌ 클립보드를 읽을 수 없습니다. 브라우저 권한을 확인해주세요.');
            setTimeout(() => setImportToast(null), 3000);
        }
    }, [onDataChange]);

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

    // Filter and search
    const filteredTrips = tripsWithStatus.filter(t => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            t.name.toLowerCase().includes(q) ||
            t.location.toLowerCase().includes(q) ||
            t.purpose.toLowerCase().includes(q);

        const matchesStatus = filterStatus === 'all' || t.derivedStatus === filterStatus;

        return matchesSearch && matchesStatus;
    });

    // Sort
    const sortedTrips = [...filteredTrips].sort((a, b) => {
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
            setSortOrder('asc'); // Default asc for text, might want desc for date? 
            // Actually usually date desc (latest first) is better, but let's stick to simple toggle
        }
    };

    const handleDeleteTrip = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('이 출장 기록을 삭제하시겠습니까?')) {
            deleteBusinessTrip(id);
            setTrips(getBusinessTrips());
            onDataChange?.();
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
            case 'planned': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
            case 'completed': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
            default: return '';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return '출장중';
            case 'planned': return '예정';
            case 'completed': return '종료';
            default: return status;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Plane className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">출장 현황</h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({sortedTrips.length}건)
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'list'
                                    ? 'bg-white dark:bg-gray-700 shadow text-gray-800 dark:text-gray-200'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                            >
                                목록
                            </button>
                            <button
                                onClick={() => setViewMode('gantt')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'gantt'
                                    ? 'bg-white dark:bg-gray-700 shadow text-gray-800 dark:text-gray-200'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                            >
                                간트 차트
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-2">
                            <ClipboardPaste className="w-3.5 h-3.5" />
                            <span>Ctrl+Shift+V: 가져오기</span>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    {viewMode === 'list' ? (
                        <>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="이름, 장소, 목적 검색..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                                />
                            </div>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                className="text-xs border border-gray-300 rounded-lg px-2 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                                <option value="all">전체 상태</option>
                                <option value="active">출장중</option>
                                <option value="planned">예정</option>
                                <option value="completed">종료</option>
                            </select>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 w-full">
                            <div className="flex items-center gap-1 text-sm bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                <input
                                    type="date"
                                    value={ganttStartDate}
                                    onChange={(e) => setGanttStartDate(e.target.value)}
                                    className="bg-transparent border-none text-gray-700 dark:text-gray-300 text-xs focus:ring-0 p-0"
                                />
                                <span className="text-gray-400">~</span>
                                <input
                                    type="date"
                                    value={ganttEndDate}
                                    onChange={(e) => setGanttEndDate(e.target.value)}
                                    className="bg-transparent border-none text-gray-700 dark:text-gray-300 text-xs focus:ring-0 p-0"
                                />
                            </div>

                            <select
                                value={todayColor}
                                onChange={(e) => setTodayColor(e.target.value as TodayColor)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                            >
                                <option value="yellow">노란색 (오늘)</option>
                                <option value="green">초록색 (오늘)</option>
                                <option value="blue">파란색 (오늘)</option>
                                <option value="purple">보라색 (오늘)</option>
                                <option value="red">빨간색 (오늘)</option>
                            </select>

                            <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
                                <span>* Alt+휠: 줌 인/아웃</span>
                                <span className="mx-1">|</span>
                                <span>가로 스크롤하여 기간 확인</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Import Toast */}
            {importToast && (
                <div className="flex-shrink-0 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">{importToast}</p>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {viewMode === 'list' ? (
                    <table className="w-full text-sm">
                        {/* ... Existing Table Header & Body ... */}
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 w-12">#</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">이름 {sortField === 'name' && <ArrowUpDown className="w-3 h-3" />}</div>
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">기간</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">일수</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer" onClick={() => handleSort('location')}>
                                    <div className="flex items-center gap-1">장소 {sortField === 'location' && <ArrowUpDown className="w-3 h-3" />}</div>
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer" onClick={() => handleSort('purpose')}>
                                    <div className="flex items-center gap-1">목적 {sortField === 'purpose' && <ArrowUpDown className="w-3 h-3" />}</div>
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">상태</th>
                                <th className="px-4 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTrips.map((trip, idx) => {
                                const start = new Date(trip.startDate);
                                const end = new Date(trip.endDate);
                                const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                                return (
                                    <tr key={trip.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                            <div className="flex items-center gap-1">
                                                {trip.name}
                                                {!trip.knoxId && (
                                                    <span title="팀원 정보와 매칭되지 않음">
                                                        <AlertCircle className="w-3 h-3 text-orange-400" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                            {trip.startDate} ~ {trip.endDate}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-center">
                                            {duration}일
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{trip.location}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{trip.purpose}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(trip.derivedStatus)}`}>
                                                {getStatusLabel(trip.derivedStatus)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={e => handleDeleteTrip(e, trip.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    // Gantt View
                    <div
                        ref={containerRef}
                        className="relative h-full overflow-hidden flex flex-col"
                    >
                        {/* Timeline Header (Synced Scroll) */}
                        {/* Timeline Header (Synced Scroll) */}
                        <div
                            ref={headerRef}
                            className="overflow-hidden border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                        >
                            <div className="flex items-stretch">
                                {/* Spacer to match sticky column width */}
                                <div className="w-32 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"></div>

                                <div className="flex" style={{ width: dates.length * dayWidth, paddingRight: 17 }}>
                                    {dates.map(date => {
                                        const day = date.getDay();
                                        const isWeekend = day === 0 || day === 6;
                                        const isToday = date.toDateString() === new Date().toDateString();
                                        return (
                                            <div
                                                key={date.toISOString()}
                                                className={`flex-shrink-0 border-r border-gray-100 dark:border-gray-700 text-center text-xs py-1 ${isWeekend ? 'bg-gray-100 dark:bg-gray-700/30' : ''} ${isToday ? getTodayColorClass(todayColor, true) : ''}`}
                                                style={{ width: dayWidth }}
                                            >
                                                <div className={`text-[10px] ${day === 0 ? 'text-red-500' : day === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {['일', '월', '화', '수', '목', '금', '토'][day]}
                                                </div>
                                                <div className={`text-gray-700 dark:text-gray-300 ${isToday ? 'font-bold' : 'font-medium'}`}>
                                                    {date.getDate()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Timeline Body (Scroll Source) */}
                        <div
                            ref={bodyRef}
                            className="flex-1 overflow-auto"
                            onScroll={handleBodyScroll}
                        >
                            <div className="relative min-w-max">
                                {/* Member Rows */}
                                {members.map((member, idx) => {
                                    const memberTrips = tripsByMember.get(member.knoxId) || [];
                                    return (
                                        <div key={member.knoxId} className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            {/* Static Name Column (Compact: Row) */}
                                            <div className="sticky left-0 w-32 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium z-10 flex items-center justify-between">
                                                <div className="text-gray-800 dark:text-gray-200 truncate font-semibold">{member.name}</div>
                                                <div className="text-gray-400 truncate ml-1 text-[10px]">{member.department}</div>
                                            </div>

                                            <div className="relative h-8 overflow-hidden" style={{ width: dates.length * dayWidth }}>
                                                {/* Grid lines */}
                                                <div className="absolute inset-0 flex pointer-events-none">
                                                    {dates.map((date, i) => {
                                                        const day = date.getDay();
                                                        const isWeekend = day === 0 || day === 6;
                                                        const isToday = date.toDateString() === new Date().toDateString();
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`flex-shrink-0 h-full border-r border-gray-100 dark:border-gray-800/50 ${isWeekend ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''} ${isToday ? getTodayColorClass(todayColor, false) : ''}`}
                                                                style={{ width: dayWidth }}
                                                            />
                                                        );
                                                    })}
                                                </div>

                                                {/* Trips */}
                                                {memberTrips.map(trip => {
                                                    const start = new Date(trip.startDate);
                                                    const end = new Date(trip.endDate);
                                                    const viewStart = new Date(ganttStartDate);

                                                    const diffDays = Math.floor((start.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
                                                    const durationDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                                                    if (diffDays + durationDays < 0) return null;

                                                    const left = diffDays * dayWidth;
                                                    const width = durationDays * dayWidth;

                                                    // Colors
                                                    let bgClass = 'bg-blue-400/80 dark:bg-blue-600/80';
                                                    if (trip.status === 'completed') bgClass = 'bg-gray-300 dark:bg-gray-600';
                                                    if (trip.status === 'active') bgClass = 'bg-green-500/80 dark:bg-green-600/80';

                                                    return (
                                                        <div
                                                            key={trip.id}
                                                            className={`absolute top-1 h-6 rounded shadow-sm border border-white/20 px-1.5 flex items-center text-[10px] text-white overflow-hidden whitespace-nowrap z-0 ${bgClass}`}
                                                            style={{
                                                                left: Math.max(0, left) + 1,
                                                                width: Math.max(dayWidth, width) - 2,
                                                            }}
                                                            title={`${trip.purpose} (${trip.startDate}~${trip.endDate})`}
                                                            onClick={() => alert(`${trip.name}\n${trip.purpose}\n${trip.startDate} ~ ${trip.endDate}\n${trip.location}`)}
                                                        >
                                                            {trip.purpose}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Unmatched Rows */}
                                {unmatchedTrips.length > 0 && (
                                    <div className="bg-orange-50/30 dark:bg-orange-900/10 mt-2 border-t border-orange-200 dark:border-orange-800">
                                        <div className="px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                            ⚠️ 미확인 ({unmatchedTrips.length})
                                        </div>
                                        {unmatchedTrips.map(trip => (
                                            <div key={trip.id} className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                                                <div className="sticky left-0 w-32 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium z-10 flex items-center justify-between">
                                                    <div className="text-orange-600 dark:text-orange-400 font-semibold">{trip.name}</div>
                                                    <div className="text-gray-400 truncate ml-1 text-[10px]">미매칭</div>
                                                </div>
                                                <div className="relative h-8" style={{ width: dates.length * dayWidth }}>
                                                    {/* Grid lines */}
                                                    <div className="absolute inset-0 flex pointer-events-none">
                                                        {dates.map((date, i) => {
                                                            const day = date.getDay();
                                                            const isWeekend = day === 0 || day === 6;
                                                            return <div key={i} className={`flex-shrink-0 h-full border-r border-gray-100 dark:border-gray-800/50 ${isWeekend ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''}`} style={{ width: dayWidth }} />
                                                        })}
                                                    </div>

                                                    <div className="absolute top-1 h-6 bg-orange-400/80 rounded px-1.5 flex items-center text-[10px] text-white"
                                                        style={{
                                                            left: (Math.floor((new Date(trip.startDate).getTime() - new Date(ganttStartDate).getTime()) / (1000 * 60 * 60 * 24)) * dayWidth) + 1,
                                                            width: (Math.floor((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) * dayWidth - 2
                                                        }}
                                                    >
                                                        {trip.purpose}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
