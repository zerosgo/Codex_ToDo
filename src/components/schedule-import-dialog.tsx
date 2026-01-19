import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parseScheduleText, ParsedSchedule } from '@/lib/schedule-parser';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ScheduleImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (schedules: ParsedSchedule[]) => void;
    currentYear: number;
    currentMonth: number; // 0-indexed
}

export function ScheduleImportDialog({ isOpen, onClose, onImport, currentYear, currentMonth }: ScheduleImportDialogProps) {
    const [text, setText] = useState('');

    const handleImport = () => {
        const result = parseScheduleText(text, currentYear, currentMonth);

        if (result.length === 0) {
            alert('감지된 일정이 없습니다. 텍스트 형식을 확인해주세요.');
            return;
        }

        onImport(result);
        onClose();
        // Reset state
        setText('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>팀 일정 가져오기</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
                    <div className="flex flex-col h-full gap-2">
                        <p className="text-sm text-gray-500">
                            팀장님 일정에서 Ctrl+A로 복사한 텍스트를 붙여넣으세요.
                            <br />
                            '적용하기'를 누르면 기존 팀 일정은 모두 덮어쓰기 됩니다.
                        </p>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Example:
14 Tue
09:00 - 10:00
주간회의"
                            className="flex-1 font-mono text-sm resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                    <Button onClick={handleImport} disabled={!text.trim()}>
                        적용하기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
