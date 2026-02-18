# ToDo App 코드베이스 분석 가이드 (회사 LLM 전달용)

이 문서는 `d:\(02) Project\ToDo` 프로젝트를 외부/사내 LLM이 빠르게 이해하고, 코드 분석 및 변경 영향 평가를 정확하게 수행할 수 있도록 작성된 상세 가이드입니다.

## 1) 프로젝트 한 줄 요약

- 개인 업무용 통합 앱: `할 일(Task)` + `캘린더` + `메모(Keep)` + `즐겨찾기 링크` + `팀원 관리(HR)` + `출장/근태(가antt + DB)`를 한 화면 구조에서 운영.
- 프론트엔드 단일 Next.js 앱이며, 현재 저장소 구조상 백엔드 서버/API 없이 브라우저 스토리지(LocalStorage + IndexedDB 동기화) 기반으로 동작.

## 2) 기술 스택

- 프레임워크: Next.js `16.1.1` (App Router)
- UI: React `19.2.3`, TailwindCSS v4, Radix UI, Lucide icons, Framer Motion
- 언어: TypeScript
- 데이터 저장: LocalStorage(주 저장/즉시 접근) + IndexedDB(동기화/복구용 스냅샷)
- 스크립트:
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run lint`

## 3) 핵심 디렉터리 구조

```text
src/
  app/
    layout.tsx                 # 루트 레이아웃/메타
    page.tsx                   # 메인 엔트리 (화면 모드 전환/전역 상태 관리)
    globals.css

  components/
    sidebar.tsx                # 좌측 사이드바(카테고리/미니캘린더/고정메모/즐겨찾기/내보내기)
    task-list.tsx              # 리스트형 할 일 UI
    calendar-view.tsx          # 월간 캘린더 화면
    keep-view.tsx              # 메모(Keep) 화면
    favorites-view.tsx         # 즐겨찾기 통합 화면
    dashboard-view.tsx         # 대시보드 화면
    team-member-board.tsx      # 팀원 관리 메인 화면
    team-member-modal.tsx      # 팀원 상세/수정 모달
    team-member-status-view.tsx
    team-member-status-table.tsx # 팀원 현황 피벗형 테이블 + 숫자 클릭 상세
    trip-board.tsx             # 출장/휴가/교육 보드 (리스트 + 간트)
    trip-record-board.tsx      # 출장 현황 DB(수기 데이터) 보드
    trip-name-resolver-dialog.tsx
    trip-destination-picker-dialog.tsx
    import-export-dialog.tsx   # JSON 내보내기/가져오기 UI
    schedule-import-dialog.tsx # 팀일정 텍스트 가져오기
    search-command-dialog.tsx  # 통합 검색/명령
    ... ui/*                   # 공통 UI 컴포넌트

  lib/
    types.ts                   # 전역 데이터 모델 타입
    storage.ts                 # 스토리지 CRUD + import/export + IDB 초기화 진입점
    indexeddb-storage.ts       # IndexedDB key-value 저수준 유틸
    schedule-parser.ts         # 일정 텍스트 파서
    hr-parser.ts               # 팀원 텍스트 파서/병합
    trip-parser.ts             # 출장 텍스트 파서
    trip-record-parser.ts      # 출장DB 텍스트 파서
    trip-destination-resolver.ts # 출장 destination 매핑/표시명 결정
    holidays.ts                # 공휴일 계산/조회
    utils.ts                   # 공통 유틸(cn)
```

## 4) 화면 모드와 라우팅 구조

현재 단일 라우트(`src/app/page.tsx`)에서 내부 `viewMode` 상태로 화면 전환:

- `calendar`: 캘린더 중심 화면
- `keep`: 메모 화면
- `favorites`: 즐겨찾기 통합 화면
- `team`: 팀원 관리
- `trip`: 출장/근태 보드
- `dashboard`: 대시보드
- `teamStatus`: 팀원 현황(피벗형 요약 테이블)

참고:
- `Ctrl + Left/Right` 순환 대상은 현재 `['calendar', 'keep', 'team', 'trip']` (dashboard/favorites 제외).
- 뷰 상태는 `local-tasks-current-view`로 저장/복구됨.

## 5) 전역 상태 및 초기화 흐름 (`src/app/page.tsx`)

초기 로딩 핵심 순서:

1. `initializeIndexedDBStorage()` 호출  
   - LocalStorage가 비었고 IndexedDB에 값이 있으면 LocalStorage 복구.
   - 마이그레이션 플래그(`local-tasks-idb-migrated-v1`) 없으면 지정 키들을 IDB로 1회 복사.
2. 카테고리 로드 (`getCategories`)
3. `"팀 일정"` 카테고리 자동 보장 (없으면 생성)
4. 선택 카테고리/월/날짜/뷰 모드 등 UI 상태 복원
5. 레이아웃/테마 로딩 적용

메인 전역 상태:

- 데이터: `categories`, `tasks`
- 화면: `viewMode`, `currentMonth`, `selectedDate`, `selectedCategoryIds`
- 레이아웃: `layout`, `taskListWidth`, `isSidebarVisible`, `showWeekends`
- 기타: 검색 다이얼로그/상세모달/가져오기 다이얼로그 등

## 6) 데이터 모델 (`src/lib/types.ts`)

주요 엔티티:

- `Category`: 할 일 카테고리
- `Task`: 할 일 본문(담당자/기한/태그/완료여부/소스(team/manual) 등 포함)
- `Note`: Keep 메모
- `QuickLink`: 즐겨찾기 링크
- `TeamMember`: 팀원(HR) 정보
- `BusinessTrip`: 출장/휴가/교육 일정 레코드
- `TripRecord`: 출장 현황 DB(수기 입력/가져오기용)

도메인 포인트:

- `Task.source`: `'team' | 'manual'`로 팀일정 동기화 시 덮어쓰기 정책에 사용
- `BusinessTrip.category`: `trip | vacation | education | others`
- 팀원 현황 집계는 `TeamMember.position`에서 `CL1~CL4` 정규화하여 계산

## 7) 저장소 아키텍처 (`src/lib/storage.ts`, `src/lib/indexeddb-storage.ts`)

### 7.1 기본 전략

- **실사용 읽기/쓰기 기준**: LocalStorage
- **내구성/복구 보강**: IndexedDB에 선택 key 동기화
- set/remove 시 동기화 대상 키면 비동기로 `idbSet/idbDelete` 호출

### 7.2 IDB 동기화 대상 키 (핵심)

- Core: `local-tasks-data`, `local-tasks-quick-links`, `local-tasks-notes`, `local-tasks-labels`, `local-tasks-team-members`, `local-tasks-business-trips`, `local-tasks-trip-records`, ...
- UI 상태: `local-tasks-current-view`, `local-tasks-current-month`, `local-tasks-selected-date`, `local-tasks-selected-category-ids`, `ganttViewPrefs`, `tripViewMode`, `team-member-visible-columns`, ...

### 7.3 import/export

- `exportData()`:
  - tasks/categories + notes/labels/quickLinks + 팀원 + 출장/DB + 이름해결 + 테마 + 레이아웃 + UI state snapshot까지 JSON으로 내보냄
  - 현재 포맷 버전: `version: 3`
- `importData()`:
  - 위 항목을 역으로 로딩
  - legacy 형식(`categories`, `tasks` 루트 직접 구조)도 일부 지원

결론:
- “내보내기 = 사실상 전체 데이터 백업” 동작에 가깝게 구현됨.

## 8) 기능별 코드 포인트

### 8.1 할 일/캘린더

- `task-list.tsx`: 카테고리별 리스트, 정렬/편집/완료 처리
- `calendar-view.tsx`: 날짜별 일정 시각화, 드래그/복사 연동
- `task-detail-dialog.tsx`: Task 상세 편집
- 팀 일정 가져오기(`schedule-parser.ts`)와 결합:
  - `page.tsx`의 `handleScheduleImport`에서 기존 team schedule 덮어쓰기 + 사용자 메모/URL/태그 보존 시도 + 고아 데이터 메모 백업

### 8.2 메모/즐겨찾기

- `keep-view.tsx`: 메모 보드(고정/아카이브/즐겨찾기 등)
- `sidebar.tsx`: 고정 메모 섹션 표시 + 즐겨찾기 링크 관리

### 8.3 팀원 관리

- `team-member-board.tsx`:
  - 팀원 테이블, 컬럼 가시성/순서 저장
  - `Ctrl+Shift+V` 팀원 텍스트 클립보드 import
  - overwrite / merge 가져오기 전략
- `hr-parser.ts`: 파싱 및 병합 로직

### 8.4 팀원 현황(피벗형)

- `team-member-status-view.tsx`, `team-member-status-table.tsx`
- 소속/그룹/파트 축 + CL1~CL4 + 총합계 집계
- 숫자 셀 클릭 시 해당 멤버 목록 팝업 표시 (엑셀 피벗 드릴다운 유사)

### 8.5 출장/근태

- `trip-board.tsx`:
  - 리스트/간트 모드
  - 카테고리 필터(출장/휴가/교육/기타), 목적지 필터, 소속/그룹/파트 필터
  - 지난 일정 숨김(`hidePastTrips`) 및 지난 바 시각 스타일 처리
  - 바 색상: 목적지 매핑 결과 우선, 없으면 카테고리 색
- `trip-record-board.tsx`: 수기 DB 관리
- `trip-destination-resolver.ts`: 출장 레코드와 DB destination 매칭/레이블 생성

## 9) 단축키/사용성 핵심

`src/app/page.tsx` 중심:

- `Ctrl + \``: 사이드바 토글
- `Ctrl + 1/2/3`: 레이아웃 전환
- `Ctrl + 6~0`: 레이아웃 프리셋 로드
- `Ctrl + Shift + 6~0`: 레이아웃 프리셋 저장
- `Ctrl + K`: 검색 다이얼로그
- `Ctrl + Left/Right`: 주요 뷰 순환(calendar/keep/team/trip)
- `Ctrl + Shift + V`: 컨텍스트별 클립보드 import (화면마다 다르게 동작)

## 10) 주요 저장 키(운영/분석 시 자주 참고)

- `local-tasks-data` (Category + Task)
- `local-tasks-notes`
- `local-tasks-quick-links`
- `local-tasks-labels`
- `local-tasks-team-members`
- `business-trips` (코드상 trip key)
- `trip-records` (수기 DB)
- `trip-name-resolution`
- `tripDestinationMappings`
- `ganttViewPrefs`
- `tripViewMode`
- `calendar-settings`
- `local-tasks-current-view/current-month/selected-date/selected-category-ids`

## 11) 현재 코드베이스 리스크 / 주의사항

### 11.1 한글 인코딩 깨짐(mojibake) 잔존 가능성

- 일부 파일의 한글 문자열이 깨진 흔적이 남아 있음(주석/라벨/알림 문구 등).
- 원인 가능성:
  - 파일 인코딩이 UTF-8이 아닌 상태에서 저장/병합
  - 콘솔/에디터 코드페이지 혼합
- 영향:
  - UI 문구 깨짐
  - LLM 분석 시 “오탐” (의미 없는 문자열로 해석)

LLM 분석 시 권장:
- 로직/상태/함수 호출 중심으로 판단하고, 문자열 텍스트는 신뢰도 낮게 간주.
- 특히 `label/title/alert` 텍스트는 동작보다 표현 문제로 분리.

### 11.2 저장소 이원화(LocalStorage + IDB)

- 현재는 로직 단순성을 위해 LocalStorage 우선 접근.
- 대용량 장기 사용 시(년 단위 누적) IDB 중심으로 읽기 경로를 전환할 여지가 있음.

## 12) 회사 LLM에게 요청할 때 권장 프롬프트 예시

### 12.1 구조 분석 요청

```text
첨부한 코드 가이드와 실제 소스 기준으로,
1) 화면별 상태 관리 흐름
2) storage.ts 중심 데이터 영속화 정책
3) trip-board.tsx의 필터/렌더링 성능 병목
을 파일/함수 단위로 분석해줘.
```

### 12.2 수정 안전성 검토 요청

```text
아래 변경 요구를 적용할 때,
1) 영향받는 파일 목록
2) 회귀 위험 포인트
3) 최소 테스트 시나리오
를 정리해줘.
특히 page.tsx, storage.ts, trip-board.tsx, team-member-board.tsx를 우선 검토해줘.
```

### 12.3 인코딩 이슈 정리 요청

```text
한글 깨짐 문자열을 의미 단위로 복원 후보를 제시하고,
로직 문자열/라벨 문자열/주석 문자열로 분류해 우선순위를 만들어줘.
```

## 13) 빠른 파일별 역할 인덱스

- 앱 엔트리: `src/app/page.tsx`
- 전역 데이터모델: `src/lib/types.ts`
- 저장/백업/가져오기: `src/lib/storage.ts`, `src/lib/indexeddb-storage.ts`
- 캘린더/할일: `src/components/calendar-view.tsx`, `src/components/task-list.tsx`
- 메모: `src/components/keep-view.tsx`
- 팀원관리: `src/components/team-member-board.tsx`, `src/components/team-member-modal.tsx`
- 팀원현황 피벗: `src/components/team-member-status-view.tsx`, `src/components/team-member-status-table.tsx`
- 출장보드: `src/components/trip-board.tsx`, `src/components/trip-record-board.tsx`
- 파서:
  - 일정: `src/lib/schedule-parser.ts`
  - 팀원: `src/lib/hr-parser.ts`
  - 출장: `src/lib/trip-parser.ts`
  - 출장DB: `src/lib/trip-record-parser.ts`
  - 목적지 매칭: `src/lib/trip-destination-resolver.ts`

## 14) 결론 (회사 LLM 전달 요약)

- 이 프로젝트는 단일 페이지 상태머신(`page.tsx`) + 모듈형 보드 컴포넌트 + 브라우저 저장소 기반 아키텍처.
- 기능 범위는 “개인 할일 + 팀운영(HR/출장)”까지 넓고, 스토리지 레이어(`storage.ts`)가 사실상 백엔드 역할.
- 분석/수정 시 최우선 파일은 `page.tsx`, `storage.ts`, `trip-board.tsx`, `team-member-board.tsx`.
- 문자열 인코딩 이슈가 있으므로 UI 텍스트와 비즈니스 로직을 분리해서 읽는 것이 정확도에 유리.
