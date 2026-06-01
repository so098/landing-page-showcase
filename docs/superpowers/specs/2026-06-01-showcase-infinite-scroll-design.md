# 쇼케이스 무한스크롤 페이지 (/showcase) — 설계서

- 작성일: 2026-06-01
- 상태: 설계 승인됨
- 상위 문서: [2026-05-29-fullstack-platform-design.md](2026-05-29-fullstack-platform-design.md) — 마스터 스펙 ②단계의 부분 범위
- 선행 작업: ① 데이터 토대 완료 (Express + Prisma API, 커서 페이지네이션)

---

## 1. 목표

헤더의 "쇼케이스" 메뉴를 클릭하면 전용 쇼케이스 목록 페이지(`/showcase`)로 이동하고,
그 페이지에서 **무한스크롤**로 더 많은 랜딩페이지를 탐색할 수 있게 한다.

**범위 (이번 단계)**
- `/showcase` 신규 라우트 — 무한스크롤 목록
- React Query `useInfiniteQuery` + IntersectionObserver 센티널
- 업종 태그 필터 (서버 필터링)
- 카드 클릭 시 기존 PreviewModal 미리보기
- 시드 데이터 ~160개로 확장 (무한스크롤 체감용)

**범위 제외 (다음 단계)**
- MinIO 실제 이미지 업로드/서빙
- `@tanstack/react-virtual` 가상화
- 쇼케이스 개별 상세 페이지

---

## 2. 사용자 흐름

```
메인(/) 헤더 "쇼케이스" 클릭
   → /showcase 이동
   → 첫 12개 카드 표시 (PlaceholderMock 썸네일)
   → 스크롤이 바닥 근처에 도달하면 다음 12개 자동 로드
   → 업종 탭 클릭 시 해당 업종만 첫 페이지부터 다시 로드
   → 카드 클릭 시 데스크탑/모바일 미리보기 모달
   → 끝까지 스크롤하면 "전부 봤어요" 문구
```

- `/showcase` 페이지에도 동일한 헤더가 있고, 로고 클릭 시 `/`로 복귀.
- 메인 페이지의 기존 동작(5개 슬라이더 + 모달)은 변경하지 않는다.

---

## 3. 아키텍처

### 3.1 백엔드 (apps/api) — 시드 확장만

API는 변경하지 않는다. `GET /api/showcases?limit=&cursor=&category=` 커서 페이지네이션이 이미 구현돼 있다.

**시드 데이터 확장** — `apps/api/src/data/seed-data.ts`
- 기존 40개 원본 항목 유지
- 결정적(deterministic) 생성 함수를 추가해 업종별 변형 항목을 만들어 **총 ~160개**로 확장
  - 이름/문구/색상/레이아웃을 조합 테이블에서 인덱스 기반으로 생성 (난수 사용 금지 → 시드 멱등성 유지)
  - slug는 `{category}-gen-{n}` 형식으로 기존 slug와 충돌 없음
- 시드 생성 로직은 단위 테스트로 검증 (총 개수, slug 유일성, 카테고리 유효성, layout 유효성)

### 3.2 프론트 (apps/web)

```
apps/web/src/
├─ app/
│  ├─ page.tsx                        # 수정: 헤더 "쇼케이스" 링크 #showcase → /showcase
│  └─ showcase/
│     └─ page.tsx                     # 신규: 무한스크롤 목록 페이지
├─ components/
│  ├─ SiteHeader.tsx                  # 신규: 메인/쇼케이스 페이지 공용 헤더 (로고 + 내비)
│  └─ InfiniteShowcaseGrid.tsx        # 신규: 그리드 + 센티널 + 로딩/끝 상태
└─ lib/
   └─ queries.ts                      # 수정: useInfiniteShowcases(category) 훅 추가
```

**데이터 흐름**
```
useInfiniteShowcases(category)
  └─ useInfiniteQuery({
       queryKey: ["showcases", "infinite", category],
       queryFn: ({ pageParam }) => fetchShowcases({ limit: 12, cursor: pageParam, category }),
       getNextPageParam: (last) => last.nextCursor,   // null이면 끝
     })
  → pages.flatMap(p => p.items) 평탄화
  → InfiniteShowcaseGrid 렌더
```

**무한스크롤 트리거**
- 그리드 맨 아래 센티널 `<div ref={sentinelRef} />`
- IntersectionObserver가 센티널 가시화 감지 → `hasNextPage && !isFetchingNextPage`이면 `fetchNextPage()`
- rootMargin을 넉넉히(예: `400px`) 줘서 바닥 도달 전에 미리 로드

**카테고리 필터**
- 기존 `TagBar` 재사용. 탭 변경 → category 상태 변경 → queryKey 변경 → React Query가 자동으로 첫 페이지부터 재조회
- 탭별 카운트: 무한스크롤 페이지에서는 전체 개수를 모르므로 카운트 배지는 표시하지 않거나, TagBar에 카운트 생략 옵션을 둔다

**컴포넌트 책임**
| 컴포넌트 | 책임 |
|---|---|
| `showcase/page.tsx` | 헤더 + 카테고리 상태 + 모달 상태. 훅 데이터를 그리드에 전달 |
| `InfiniteShowcaseGrid` | 카드 그리드 렌더 + 센티널 + 로딩 스피너/끝 문구 |
| `SiteHeader` | 로고 + 내비 링크 (메인/쇼케이스 공용) |
| `ShowcaseCard`, `PreviewModal`, `TagBar`, `PagePreview` | 기존 그대로 재사용 |

### 3.3 상태 처리

| 상태 | UI |
|---|---|
| 첫 로드 중 | "불러오는 중…" (기존 메인 페이지와 동일 패턴) |
| 다음 페이지 로드 중 | 그리드 하단에 작은 스피너/문구 |
| 마지막 페이지 도달 | "전부 봤어요 🌸" 문구, 센티널 비활성화 |
| API 에러 | "데이터를 불러오지 못했어요. API 서버(4000)가 켜져 있는지 확인해 주세요." |
| 필터 결과 0개 | 기존 빈 상태 UI ("준비된 페이지가 없어요") |

---

## 4. 테스트

| 대상 | 방법 |
|---|---|
| 시드 생성 로직 | api 단위 테스트: 총 개수(≥160), slug 유일성, 카테고리/레이아웃 유효성 |
| API 커서 페이지네이션 | 기존 테스트 유지 (변경 없음) |
| useInfiniteShowcases 평탄화/커서 로직 | 페이지 평탄화·getNextPageParam 동작은 구현이 단순하므로 수동 검증 (E2E) |
| E2E 수동 검증 | /showcase 진입 → 스크롤 → 추가 로드 → 필터 변경 → 모달 열기 |

---

## 5. 결정 사항 / 근거

| 결정 | 근거 |
|---|---|
| IntersectionObserver 센티널 (스크롤 이벤트 ❌) | 표준 패턴, 쓰로틀링 불필요, 레이아웃 변경에 강함 |
| 라우트명 `/showcase` (`/gallery` ❌) | 사용자가 "쇼케이스 페이지"로 지칭. 헤더 메뉴명과 일치 |
| 페이지당 12개 | API 기본 limit과 일치, 그리드 12 = 2/3/4열 배수라 줄 깨짐 없음 |
| 시드 확장은 결정적 생성 | 시드 멱등성 유지, 테스트 가능, 손으로 160개 작성하는 비용 회피 |
| 카드 클릭 = 모달 (상세 페이지 ❌) | 사용자 결정. 메인 페이지와 동일한 UX 일관성 |
| 백엔드 무변경 | 커서 페이지네이션이 이미 무한스크롤을 위해 설계됨 |
