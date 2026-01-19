# Project Context & Handoff Guide

이 문서는 다른 환경(Notebook 등)의 Antigravity(AI)가 현재 프로젝트의 문맥, 규칙, 주요 로직을 빠르게 파악할 수 있도록 작성되었습니다.
새로운 환경에서 작업을 시작할 때, **"PROJECT_CONTEXT.md 파일을 읽고 프로젝트 현황을 파악해줘"** 라고 요청하세요.

## 1. 프로젝트 개요 (Project Overview)
- **이름**: Local Tasks (ToDo App)
- **목적**: 개인 업무 효율성을 위한 로컬 중심의 할 일 및 일정 관리 웹 애플리케이션
- **핵심 철학**: 서버 없이 브라우저(LocalStorage)에 모든 데이터를 저장하여 빠르고 간편하게 사용.

## 2. 기술 스택 (Tech Stack)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **UI Components**: Shadcn UI (Radix UI 기반)
- **State Management**: React `useState` + `localStorage` (Custom `storage.ts` logic)
- **Date Handling**: `date-fns`

## 3. 주요 기능 및 로직 (Key Features & Logic)

### A. 데이터 저장소 (`src/lib/storage.ts`)
- 모든 데이터는 `localStorage`에 JSON 형태로 저장됩니다.
- 주요 키: `tasks`, `categories`, `layout-state`, `theme-preference`.
- **Layout Persistence**: 사이드바 가시성, 할 일 목록 너비, 주말 표시 여부(`showWeekends`) 등이 자동 저장됩니다.

### B. 일정 파싱 및 하이라이트 (`src/lib/schedule-parser.ts`)
- 텍스트 형태의 일정 목록을 붙여넣으면 자동으로 분석하여 캘린더에 등록합니다.
- **하이라이트 규칙 (Highlight Rules)**:
    - **Level 1 (대표/이청)**: `highlightLevel: 1` -> **파란색 (Blue)**
    - **Level 2 (사업부/이주형)**: `highlightLevel: 2` -> **초록색 (Green)**
    - **Level 3 (센터/정성욱)**: `highlightLevel: 3` -> **보라색 (Purple)**

### C. 캘린더 뷰 (`src/components/calendar-view.tsx`)
- 월간 달력 뷰를 제공하며, 일정(`Task`)을 날짜별로 렌더링합니다.
- **스타일링 규칙 (중요)**:
    - 하이라이트된 일정은 **연한 회색 배경**(`bg-gray-100`)을 공통으로 가집니다.
    - **왼쪽 테두리(Left Border)**: `border-l-[3px]` (기존 2px에서 50% 확대됨). 색상은 위 레벨에 따름.
    - **아이콘(Icon)**: 일정 제목 우측에 원형 점 표시.
        - Level 1 (대표): `bg-blue-500` 원형 아이콘
        - Level 2 (사업부): `bg-green-500` 원형 아이콘
        - **Level 3 (센터): 아이콘 없음 (사용자 요청)**

### D. 할 일 목록 (`src/components/task-list.tsx`)
- Drag & Drop으로 순서 변경 가능 (`framer-motion` 사용).
- **레이아웃 대응**: 패널 폭이 좁아질 경우 제목("내 할 일")이 세로로 깨지지 않도록 `whitespace-nowrap` 및 `flex-wrap`이 적용되어 있습니다.

## 4. 최근 변경 사항 (Recent Changes History)
1.  **테두리 두께 조정**: 하이라이트 일정의 왼쪽 테두리를 `2px` -> `3px`로 50% 확대.
2.  **아이콘 추가**: 대표(파란색), 사업부(초록색) 일정 우측에 식별용 원형 아이콘 추가. (센터는 제외).
3.  **헤더 레이아웃 수정**: `TaskList` 헤더가 좁은 폭에서도 깨지지 않도록 반응형 스타일 적용.
4.  **Git 설정**: `.gitignore`에 `local-tasks.zip` 제외 설정 및 초기 업로드 완료.

## 5. 다음 작업 시 유의사항
- 코드를 수정할 때는 항상 기존 `localStorage` 구조를 깨뜨리지 않도록 주의해야 합니다.
- UI 수정 시 Dark Mode(`dark:`) 스타일을 함께 고려해야 합니다.
- **색상 규칙**: 대표(Blue) / 사업부(Green) / 센터(Purple) 규칙을 엄격히 준수하세요.
