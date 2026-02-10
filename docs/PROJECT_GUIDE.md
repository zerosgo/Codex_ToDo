# 📚 ToDo 앱 완벽 가이드

> 코딩 초보자를 위한 프로젝트 구조 및 기능 설명서

---

## 🎯 프로젝트 개요

이 프로젝트는 **할일 관리 + 캘린더**가 합쳐진 웹 애플리케이션입니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| 📅 캘린더 뷰 | 월별 일정을 한눈에 확인 |
| ✅ Task List | 할일 목록 관리 (체크, 편집, 삭제) |
| 🔍 스마트 검색 | 자연어로 일정 검색 |
| 📝 메모 기능 | Keep 스타일 메모 저장 |
| 🏷️ 카테고리 | 일정을 그룹별로 분류 |

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (React 기반) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| 데이터 저장 | LocalStorage |
| 애니메이션 | Framer Motion |

### 왜 이 기술들을 선택했나요?

1. **Next.js**: React를 더 쉽게 사용할 수 있게 해주는 프레임워크
2. **TypeScript**: JavaScript에 "타입"을 추가해서 버그를 미리 잡아줌
3. **Tailwind CSS**: 클래스만으로 빠르게 스타일 적용
4. **LocalStorage**: 서버 없이 브라우저에 데이터 저장

---

## 📁 폴더 구조

| 경로 | 설명 |
|------|------|
| `src/app/page.tsx` | 메인 페이지 (앱 시작점) |
| `src/components/` | 재사용 가능한 UI 컴포넌트들 |
| `src/lib/storage.ts` | 데이터 저장/불러오기 함수 |
| `src/lib/types.ts` | 타입 정의 |
| `docs/work-logs/` | 작업 일지 |

### 주요 컴포넌트 파일

| 파일명 | 역할 |
|--------|------|
| `calendar-view.tsx` | 📅 캘린더 화면 |
| `task-list.tsx` | ✅ 할일 목록 |
| `sidebar.tsx` | 📂 왼쪽 메뉴 |
| `search-command-dialog.tsx` | 🔍 검색창 |
| `task-detail-dialog.tsx` | 📝 할일 상세 모달 |

---

## 🧩 핵심 컴포넌트 설명

### 1. page.tsx - 메인 페이지

앱의 시작점! 모든 것이 여기서 조립됩니다.

```tsx
export default function Home() {
  // 상태(state) 관리
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState([]);
  const [viewMode, setViewMode] = useState('calendar');
  
  return (
    <div>
      <Sidebar />           {/* 왼쪽 메뉴 */}
      <CalendarView />      {/* 캘린더 */}
      <TaskList />          {/* 할일 목록 */}
    </div>
  );
}
```

**쉽게 이해하기:**
- `useState`: 데이터를 저장하는 "상자" 같은 것
- 데이터가 바뀌면 → 화면이 자동으로 업데이트됨

---

### 2. calendar-view.tsx - 캘린더

달력을 그려주는 컴포넌트입니다.

```tsx
export function CalendarView({ tasks, currentMonth }) {
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  
  return (
    <div className="grid grid-cols-7">
      {days.map(day => (
        <DayCell 
          date={day} 
          tasks={getTasksForDate(day)} 
        />
      ))}
    </div>
  );
}
```

**주요 기능:**
- 📅 월별 날짜 표시
- 🎯 해당 날짜의 일정 표시
- 🖱️ 드래그 앤 드롭으로 일정 이동
- ⌨️ 단축키: `Ctrl+M` (팀 일정 토글)

---

### 3. task-list.tsx - 할일 목록

할일 카드들을 보여주는 컴포넌트입니다.

```tsx
function TaskItem({ task }) {
  return (
    <div className="p-3 rounded-lg border shadow-md">
      <Checkbox 
        checked={task.completed}
        onChange={() => toggleComplete(task.id)}
      />
      <span>{task.title}</span>
      {task.dueDate && <span>D-{daysUntil(task.dueDate)}</span>}
    </div>
  );
}
```

**주요 기능:**
- ✅ 할일 완료 체크
- 📝 제목 인라인 편집
- 🏷️ 태그 표시
- 📎 자료 URL 클립 아이콘

---

### 4. storage.ts - 데이터 저장

LocalStorage에 데이터를 저장하고 불러오는 함수들입니다.

```tsx
// 할일 저장하기
export const addTask = (task: Task) => {
  const tasks = getTasks();
  tasks.push(task);
  localStorage.setItem('tasks', JSON.stringify(tasks));
};

// 할일 불러오기
export const getTasks = (): Task[] => {
  const data = localStorage.getItem('tasks');
  return data ? JSON.parse(data) : [];
};
```

**왜 LocalStorage를 사용하나요?**
- 서버가 필요 없음 (비용 절감)
- 오프라인에서도 동작
- 설정이 간단함

---

## 📊 데이터 구조

### Task (할일)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 고유 ID |
| title | string | 제목 |
| assignee | string | 담당자 |
| organizer | string? | 주관자 |
| dueDate | string | 마감일 |
| dueTime | string | 시간 |
| completed | boolean | 완료 여부 |
| notes | string | 메모 |
| tags | string[] | 태그들 |
| resourceUrls | string[] | 자료 URL들 |

### Category (카테고리)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 고유 ID |
| name | string | 이름 |
| color | string | 색상 (HEX) |
| order | number | 정렬 순서 |

---

## ⌨️ 단축키 모음

| 단축키 | 기능 |
|--------|------|
| `Ctrl + /` | 검색창 열기 |
| `Ctrl + M` | 팀 일정 ↔ 이전 보기 토글 |
| `Ctrl + ←` | 이전 달 이동 |
| `Ctrl + →` | 다음 달 이동 |
| `Ctrl + 1/2/3` | 레이아웃 변경 |
| `Ctrl + Click` | URL 붙여넣기 |

---

## 🔍 스마트 검색 기능

### 사용 방법

1. `Ctrl + /` 로 검색창 열기
2. 검색어 입력

### 자연어 검색 예시

| 입력 | 동작 |
|------|------|
| 지난주 회의 | 지난주 일정 중 "회의" 검색 |
| 이번 달 점검 | 이번 달 일정 중 "점검" 검색 |
| 오늘 | 오늘 일정만 표시 |
| 다음주 | 다음주 일정만 표시 |

### 검색 대상
- 📌 제목
- 👤 담당자
- 👤 주관자
- 🏷️ 태그
- 📝 메모

---

## 🎨 스타일링 (Tailwind CSS)

### 기존 CSS vs Tailwind

**기존 CSS:**
```css
.button {
  padding: 8px 16px;
  background-color: blue;
  border-radius: 8px;
}
```

**Tailwind:**
```html
<button className="px-4 py-2 bg-blue-500 rounded-lg">
  버튼
</button>
```

### 자주 사용하는 클래스

| 클래스 | 의미 |
|--------|------|
| `flex` | Flexbox 레이아웃 |
| `grid` | Grid 레이아웃 |
| `p-4` | padding: 16px |
| `m-2` | margin: 8px |
| `bg-blue-500` | 파란 배경색 |
| `text-gray-700` | 회색 글자색 |
| `rounded-lg` | 둥근 모서리 |
| `shadow-md` | 그림자 효과 |

---

## 🔄 데이터 흐름

1. **사용자 입력** → 할일 추가 버튼 클릭
2. **React 상태 업데이트** → `setTasks()` 호출
3. **LocalStorage 저장** → `localStorage.setItem()`
4. **화면 갱신** → React가 자동으로 리렌더링

---

## 🚀 개발 시작하기

### 1. 프로젝트 클론

```bash
git clone https://github.com/zeros79ya/ToDo.git
cd ToDo
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 브라우저에서 확인

```
http://localhost:3000
```

---

## 📝 코드 수정 예시

### 예시 1: 새 버튼 추가하기

```tsx
<button 
  onClick={() => alert('클릭!')}
  className="px-3 py-1 bg-green-500 text-white rounded"
>
  새 버튼
</button>
```

### 예시 2: 새 상태 추가하기

```tsx
const [count, setCount] = useState(0);

<button onClick={() => setCount(count + 1)}>
  클릭 횟수: {count}
</button>
```

---

## ❓ 자주 묻는 질문

**Q: 데이터가 사라졌어요!**

A: 브라우저 캐시를 삭제하면 LocalStorage도 지워집니다.

**Q: 다른 PC에서 데이터를 사용하려면?**

A: 현재는 LocalStorage 기반이라 같은 PC에서만 데이터 유지됩니다.

**Q: TypeScript 에러가 나요!**

A: 타입이 맞지 않는 경우입니다. `types.ts`에서 올바른 타입을 확인하세요.

---

## 📖 더 배우기

- [Next.js 공식 문서](https://nextjs.org/docs)
- [React 입문 가이드](https://react.dev/learn)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)

---

> 📌 이 문서는 지속적으로 업데이트됩니다.
> 
> 최종 수정일: 2026-02-09
