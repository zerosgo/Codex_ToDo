# 🔄 ToDo 프로젝트 개발 이어가기 가이드
> 다른 PC에서 프로젝트를 이어서 개발할 때 참고하는 문서

---

## 📋 빠른 시작 (5분 안에 개발 환경 구축)

### 1단계: 프로젝트 클론
```bash
# 원하는 폴더로 이동
cd D:\Projects  # 또는 원하는 경로

# GitHub에서 클론
git clone https://github.com/zeros79ya/ToDo.git

# 프로젝트 폴더로 이동
cd ToDo
```

### 2단계: 의존성 설치
```bash
npm install
```

### 3단계: 개발 서버 실행
```bash
npm run dev
```

### 4단계: 브라우저에서 확인
```
http://localhost:3000
```

---

## 🔧 개발 환경 요구사항

| 항목 | 버전 | 확인 명령어 |
|------|------|------------|
| Node.js | 18 이상 | `node --version` |
| npm | 9 이상 | `npm --version` |
| Git | 최신 | `git --version` |

### 권장 IDE
- **VS Code** + 확장 프로그램:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin (Volar)

---

## 📁 핵심 파일 위치

### 수정이 자주 필요한 파일들

```
src/
├── app/
│   └── page.tsx              # 메인 페이지 (전체 레이아웃)
│
├── components/
│   ├── calendar-view.tsx     # 📅 캘린더 뷰 (핵심)
│   ├── task-list.tsx         # ✅ Task List (핵심)
│   ├── task-detail-dialog.tsx # 📝 할일 상세 모달
│   ├── sidebar.tsx           # 📂 왼쪽 사이드바
│   ├── search-command-dialog.tsx # 🔍 검색 다이얼로그
│   ├── team-schedule-add-modal.tsx # 📋 팀 일정 추가
│   └── calendar-settings-modal.tsx # ⚙️ 캘린더 설정
│
└── lib/
    ├── storage.ts            # 💾 LocalStorage 함수들
    ├── types.ts              # 📊 타입 정의
    └── holidays.ts           # 🎌 공휴일 정보
```

---

## 🗂️ 작업 일지 확인

개발 히스토리는 `docs/work-logs/` 폴더에서 확인할 수 있습니다:

```
docs/work-logs/
├── 2026-02-01.md
├── 2026-02-04.md
└── ...
```

**최신 작업 일지를 꼭 확인하세요!** 현재까지 구현된 기능과 남은 작업을 파악할 수 있습니다.

---

## 💡 AI 어시스턴트에게 전달할 프롬프트

새 PC에서 AI 어시스턴트와 작업할 때, 아래 프롬프트를 복사해서 전달하세요:

```
나는 ToDo 앱 프로젝트를 이어서 개발하려고 해.
현재 프로젝트 폴더: [프로젝트 경로 입력]

## 프로젝트 파악 요청
1. docs/work-logs/ 폴더의 최신 작업 일지를 읽어줘
2. src/lib/types.ts 를 읽어서 데이터 구조를 파악해줘
3. HANDOFF_SUMMARY.md 가 있다면 읽어줘

파악이 끝나면 알려줘. 그 후에 추가 개발 요청을 할게.
```

---

## 🔄 Git 작업 흐름

### 코드 가져오기 (다른 PC에서 작업한 내용)
```bash
git pull origin main
```

### 코드 올리기 (작업 완료 후)
```bash
# 1. 변경된 파일 확인
git status

# 2. 모든 변경사항 스테이징
git add .

# 3. 커밋 (메시지는 한글로 작성 OK)
git commit -m "feat: 새로운 기능 추가"

# 4. 푸시
git push origin main
```

### 커밋 메시지 규칙
| 접두사 | 용도 |
|--------|------|
| `feat:` | 새 기능 추가 |
| `fix:` | 버그 수정 |
| `docs:` | 문서 수정 |
| `style:` | 코드 포맷팅 |
| `refactor:` | 코드 리팩토링 |

---

## 🐛 자주 발생하는 문제 해결

### 문제 1: `npm run dev` 실행 시 에러

```bash
# 해결: node_modules 재설치
rm -rf node_modules
rm package-lock.json
npm install
```

### 문제 2: TypeScript 타입 에러

```bash
# 해결: 타입 정의 위치 확인
# src/lib/types.ts 파일 확인
```

### 문제 3: 최신 코드가 반영 안 됨

```bash
# 해결: 캐시 삭제 후 재빌드
npm run build
npm run dev
```

### 문제 4: Clone 후 화면이 다름

```bash
# 해결: 최신 코드 확인
git log -1  # 최신 커밋 확인
git pull origin main  # 최신 코드 가져오기
```

---

## ⌨️ 알아두면 좋은 단축키

### 앱 내 단축키
| 단축키 | 기능 |
|--------|------|
| `Ctrl + /` | 검색창 열기 |
| `Ctrl + M` | 팀 일정 ↔ 이전 보기 토글 |
| `Ctrl + ←/→` | 이전/다음 달 이동 |
| `Ctrl + Click` | URL 붙여넣기 (클립보드에 URL 있을 때) |

### VS Code 단축키
| 단축키 | 기능 |
|--------|------|
| `Ctrl + P` | 파일 빠른 열기 |
| `Ctrl + Shift + F` | 전체 검색 |
| `F12` | 정의로 이동 |
| `Ctrl + Space` | 자동완성 |

---

## 📊 데이터 구조 요약

### Task (할일)
```typescript
interface Task {
  id: string;
  categoryId: string;
  title: string;
  assignee: string;
  organizer?: string;
  dueDate: string | null;
  dueTime: string | null;
  completed: boolean;
  notes: string;
  tags: string[];
  resourceUrls?: string[];
  subtasks?: Subtask[];
  isPinned?: boolean;
  highlightLevel?: 0 | 1 | 2 | 3;
}
```

### Category (카테고리)
```typescript
interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}
```

### Note (메모)
```typescript
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  color?: string;
}
```

---

## 📝 개발 시 참고할 패턴

### 1. 새로운 상태 추가
```tsx
// 상태 선언
const [newFeature, setNewFeature] = useState(false);

// localStorage에 저장하려면
useEffect(() => {
  localStorage.setItem('newFeature', JSON.stringify(newFeature));
}, [newFeature]);
```

### 2. 새로운 버튼 추가 (캘린더 헤더)
```tsx
// calendar-view.tsx의 renderHeader() 함수 내부에 추가
<button
  onClick={() => setNewFeature(!newFeature)}
  className="px-3 py-1 text-sm font-medium rounded bg-gray-100 hover:bg-gray-200"
>
  새 기능
</button>
```

### 3. 새로운 검색 필터 추가
```tsx
// search-command-dialog.tsx의 parseNaturalLanguageFilter() 함수에 추가
if (query.includes('새필터')) {
  // 필터 로직 추가
}
```

---

## 📞 문제 발생 시

1. **작업 일지 확인**: `docs/work-logs/` 폴더
2. **프로젝트 가이드 확인**: `docs/PROJECT_GUIDE.md`
3. **Git 로그 확인**: `git log --oneline -10`
4. **타입 정의 확인**: `src/lib/types.ts`

---

## ✅ 체크리스트

개발 시작 전 확인사항:

- [ ] `git pull origin main` 으로 최신 코드 가져오기
- [ ] `npm install` 으로 의존성 설치
- [ ] `npm run dev` 로 개발 서버 실행
- [ ] 브라우저에서 `localhost:3000` 확인
- [ ] 최신 작업 일지 확인

개발 완료 후 확인사항:

- [ ] `npm run build` 로 빌드 성공 확인
- [ ] 주요 기능 테스트
- [ ] 작업 일지 작성 (`docs/work-logs/YYYY-MM-DD.md`)
- [ ] `git add .` + `git commit` + `git push`

---

> 📌 이 문서는 프로젝트와 함께 지속적으로 업데이트됩니다.
> 최종 수정일: 2026-02-09
