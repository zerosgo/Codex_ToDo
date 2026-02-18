# ToDo App Codebase Analysis Guide (For Company LLM)

This document is intended to help an internal/company LLM quickly understand and analyze the project at `d:\(02) Project\ToDo`, especially for code review, impact analysis, and safe modification planning.

## 1) One-line Summary

- A personal productivity app that combines `Tasks`, `Calendar`, `Keep-style Notes`, `Quick Links`, `Team Member Management (HR)`, and `Business Trip/Attendance (List + Gantt + DB)`.
- Single Next.js frontend app. No dedicated backend/API in current repo architecture. Data persistence is browser-based (LocalStorage with IndexedDB synchronization/recovery support).

## 2) Tech Stack

- Framework: Next.js `16.1.1` (App Router)
- UI: React `19.2.3`, TailwindCSS v4, Radix UI, Lucide icons, Framer Motion
- Language: TypeScript
- Persistence: LocalStorage (primary runtime path) + IndexedDB (sync/recovery layer)
- Scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run lint`

## 3) High-level Directory Structure

```text
src/
  app/
    layout.tsx                 # Root layout/metadata
    page.tsx                   # Main entry point (view-mode switching + global state)
    globals.css

  components/
    sidebar.tsx                # Left sidebar (categories/mini calendar/pinned notes/quick links/export-import)
    task-list.tsx              # List-based task UI
    calendar-view.tsx          # Calendar screen
    keep-view.tsx              # Keep-style notes screen
    favorites-view.tsx         # Favorites integrated screen
    dashboard-view.tsx         # Dashboard screen
    team-member-board.tsx      # Team member management main screen
    team-member-modal.tsx      # Team member detail/edit modal
    team-member-status-view.tsx
    team-member-status-table.tsx # Pivot-like team status table + drill-down popup
    trip-board.tsx             # Trip/vacation/education board (list + gantt)
    trip-record-board.tsx      # Manual trip record DB board
    trip-name-resolver-dialog.tsx
    trip-destination-picker-dialog.tsx
    import-export-dialog.tsx   # JSON export/import dialog
    schedule-import-dialog.tsx # Team schedule text import
    search-command-dialog.tsx  # Global search/command modal
    ... ui/*                   # Shared UI components

  lib/
    types.ts                   # Core data models
    storage.ts                 # Storage CRUD + import/export + IDB init entry
    indexeddb-storage.ts       # Low-level IndexedDB key-value helper
    schedule-parser.ts         # Team schedule text parser
    hr-parser.ts               # HR/team-member text parser + merge logic
    trip-parser.ts             # Business trip text parser
    trip-record-parser.ts      # Manual trip-record text parser
    trip-destination-resolver.ts # Destination matching/label builder
    holidays.ts                # Holiday helper
    utils.ts                   # Shared utility (cn)
```

## 4) View Modes and Routing Model

The app currently uses a **single route** (`src/app/page.tsx`) and switches screens through internal `viewMode` state:

- `calendar`: calendar-centric workspace
- `keep`: notes workspace
- `favorites`: favorites workspace
- `team`: team member management
- `trip`: business trip/attendance board
- `dashboard`: dashboard workspace
- `teamStatus`: team status pivot view

Notes:
- `Ctrl + Left/Right` currently cycles through `['calendar', 'keep', 'team', 'trip']` (dashboard/favorites excluded).
- Current view is persisted in `local-tasks-current-view`.

## 5) Global State and Boot Flow (`src/app/page.tsx`)

Startup sequence:

1. `initializeIndexedDBStorage()`  
   - If LocalStorage is empty but IndexedDB has synced data, restore LocalStorage first.
   - If one-time migration flag (`local-tasks-idb-migrated-v1`) is missing, copy configured keys to IndexedDB.
2. Load categories (`getCategories`).
3. Ensure `"Team Schedule"` category exists (auto-create if missing).
4. Restore UI states (selected categories/month/date/view).
5. Load/apply layout and theme.

Main global states:

- Data: `categories`, `tasks`
- UI navigation: `viewMode`, `currentMonth`, `selectedDate`, `selectedCategoryIds`
- Layout: `layout`, `taskListWidth`, `isSidebarVisible`, `showWeekends`
- Modals/dialogs: search/detail/import/export/etc.

## 6) Data Models (`src/lib/types.ts`)

Main entities:

- `Category`: task list category
- `Task`: task object (assignee/date/tags/completion/source fields, etc.)
- `Note`: keep-style memo
- `QuickLink`: favorite link entry
- `TeamMember`: HR/team member profile
- `BusinessTrip`: trip/vacation/education event
- `TripRecord`: manual attendance/trip DB row

Domain-specific points:

- `Task.source`: `'team' | 'manual'`, used by schedule sync overwrite behavior.
- `BusinessTrip.category`: `trip | vacation | education | others`.
- Team-status summary normalizes `TeamMember.position` into `CL1~CL4`.

## 7) Persistence Architecture (`src/lib/storage.ts`, `src/lib/indexeddb-storage.ts`)

### 7.1 Strategy

- **Primary runtime read/write path**: LocalStorage
- **Durability/recovery support**: IndexedDB synchronized mirror for selected keys
- On set/remove for synced keys, async `idbSet/idbDelete` runs in background

### 7.2 IndexedDB-synced key groups

- Core data keys: `local-tasks-data`, `local-tasks-quick-links`, `local-tasks-notes`, `local-tasks-labels`, `local-tasks-team-members`, `local-tasks-business-trips`, `local-tasks-trip-records`, etc.
- UI/state keys: `local-tasks-current-view`, `local-tasks-current-month`, `local-tasks-selected-date`, `local-tasks-selected-category-ids`, `ganttViewPrefs`, `tripViewMode`, `team-member-visible-columns`, etc.

### 7.3 Import/Export

- `exportData()`:
  - Exports tasks/categories + notes/labels/quickLinks + team members + trips/records + name resolution + theme + layout + UI state snapshot.
  - Current format version: `version: 3`
- `importData()`:
  - Restores all above sections.
  - Includes partial legacy support for older root format (`categories`, `tasks`).

Conclusion:
- Current export behavior is effectively a near-full backup snapshot.

## 8) Feature-by-Feature Code Map

### 8.1 Tasks + Calendar

- `task-list.tsx`: category-based list, ordering/edit/complete
- `calendar-view.tsx`: date-based visualization, drag/copy interactions
- `task-detail-dialog.tsx`: task detail editing
- Team schedule import integration:
  - `handleScheduleImport` in `page.tsx` applies smart overwrite in team schedule category
  - Attempts to preserve user fields (URL/notes/tags/pin/completion)
  - Orphaned items can be backed up into pinned notes

### 8.2 Notes + Quick Links

- `keep-view.tsx`: note board (pin/archive/favorite flows)
- `sidebar.tsx`: pinned notes section + quick links section/CRUD/reorder

### 8.3 Team Member Management

- `team-member-board.tsx`:
  - Team table with customizable visible columns and column order
  - `Ctrl+Shift+V` clipboard import
  - Two import modes: overwrite vs merge
- `hr-parser.ts`: parser + merge logic

### 8.4 Team Status (Pivot-like Summary)

- `team-member-status-view.tsx`, `team-member-status-table.tsx`
- Aggregation axes: Department / Group / Part + CL1~CL4 + Total
- Clicking numeric cells opens drill-down popup list (Excel pivot-like detail expansion)

### 8.5 Trip / Attendance

- `trip-board.tsx`:
  - List/Gantt modes
  - Category filters (trip/vacation/education/others), destination filters, dept/group/part filters
  - Hide past trips (`hidePastTrips`) and past-bar visual style
  - Bar color priority: resolved destination color > category color
- `trip-record-board.tsx`: manual DB operations
- `trip-destination-resolver.ts`: destination matching and display-label composition

## 9) Keyboard Shortcuts

Core shortcuts in `src/app/page.tsx`:

- `Ctrl + \``: toggle sidebar
- `Ctrl + 1/2/3`: switch layout
- `Ctrl + 6~0`: load layout preset
- `Ctrl + Shift + 6~0`: save layout preset
- `Ctrl + K`: open search command
- `Ctrl + Left/Right`: cycle work views (`calendar/keep/team/trip`)
- `Ctrl + Shift + V`: clipboard import (context-dependent by view)

## 10) Important Storage Keys (Operationally Useful)

- `local-tasks-data` (Category + Task)
- `local-tasks-notes`
- `local-tasks-quick-links`
- `local-tasks-labels`
- `local-tasks-team-members`
- `business-trips`
- `trip-records`
- `trip-name-resolution`
- `tripDestinationMappings`
- `ganttViewPrefs`
- `tripViewMode`
- `calendar-settings`
- `local-tasks-current-view/current-month/selected-date/selected-category-ids`

## 11) Risks / Caveats for Analysis

### 11.1 Korean text encoding issues (mojibake) may remain

- Some files may contain corrupted Korean UI text in labels/messages/comments.
- Likely causes:
  - Mixed file encodings during save/merge
  - Console/editor codepage mismatch
- Impact:
  - Broken UI strings
  - LLM misinterpretation if text semantics are treated as logic

Recommendation for LLM analysis:
- Prioritize control flow/state/function calls over literal UI strings.
- Treat `label/title/alert` text separately from business logic.

### 11.2 Dual storage design (LocalStorage + IndexedDB)

- Current runtime path favors LocalStorage simplicity.
- For long-term high data volume, further evolution toward IDB-primary reads may be considered.

## 12) Suggested Prompt Patterns for Company LLM

### 12.1 Architecture analysis request

```text
Using the attached codebase guide and actual source,
analyze:
1) screen-level state flow
2) persistence policy centered on storage.ts
3) performance bottlenecks in trip-board.tsx (filter/render path)
Please provide results by file/function.
```

### 12.2 Safe change impact request

```text
For the following change request, provide:
1) impacted files
2) regression-risk points
3) minimum test scenarios
Prioritize review of page.tsx, storage.ts, trip-board.tsx, and team-member-board.tsx.
```

### 12.3 Encoding cleanup request

```text
Identify corrupted Korean strings and provide restoration candidates.
Classify by: logic strings / UI labels / comments.
Then propose a cleanup priority plan.
```

## 13) Fast File Role Index

- App entry and view state machine: `src/app/page.tsx`
- Data models: `src/lib/types.ts`
- Storage/backup/import-export: `src/lib/storage.ts`, `src/lib/indexeddb-storage.ts`
- Calendar/tasks: `src/components/calendar-view.tsx`, `src/components/task-list.tsx`
- Notes: `src/components/keep-view.tsx`
- Team management: `src/components/team-member-board.tsx`, `src/components/team-member-modal.tsx`
- Team status pivot: `src/components/team-member-status-view.tsx`, `src/components/team-member-status-table.tsx`
- Trip board: `src/components/trip-board.tsx`, `src/components/trip-record-board.tsx`
- Parsers:
  - schedule: `src/lib/schedule-parser.ts`
  - HR: `src/lib/hr-parser.ts`
  - trip: `src/lib/trip-parser.ts`
  - trip-record: `src/lib/trip-record-parser.ts`
  - destination resolver: `src/lib/trip-destination-resolver.ts`

## 14) Final Summary for Company LLM

- This project is a single-page state machine (`page.tsx`) with modular domain boards and browser-storage persistence.
- Functional scope is broad: personal tasking + organizational operations (HR/trip tracking).
- `storage.ts` functions as a de-facto backend boundary in this architecture.
- Priority files for deep analysis and safe modifications:
  - `src/app/page.tsx`
  - `src/lib/storage.ts`
  - `src/components/trip-board.tsx`
  - `src/components/team-member-board.tsx`
- Since string encoding issues may exist, separate UI text quality from business logic correctness during analysis.
