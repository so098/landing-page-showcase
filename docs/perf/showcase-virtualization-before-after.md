# /showcase 가상화 성능 측정 — Before / After

- 관련 스펙: [2026-06-02-showcase-virtualization-design.md](../superpowers/specs/2026-06-02-showcase-virtualization-design.md)
- 측정 도구: Playwright (`apps/web/e2e/measure.spec.ts`), Chromium, 뷰포트 1280×800
- 조건: **동일 시드 1,039개**, 프로덕션 빌드(`next build && next start`), workers=1
- 방법: 끝까지 스크롤(전체 로드) → 위로 끝까지 → 다시 아래로 스크롤하며 프레임 수집

## 결과

| 지표 | Before (가상화 없음) | After (가상화) |
|---|---|---|
| 측정일 | 2026-06-02 | 2026-06-03 |
| DOM 노드 수 (전체 로드 후) | 39,556 | 1,611 |
| 렌더된 카드 수 | 1,039 (= 전체) | 40 (가시 영역만) |
| JS 힙 (MB) | 42.6 | 9.5 |
| 평균 프레임 시간 (ms) | 30.5 | 23.16 |
| 50ms 초과 long frame 수 | 226 | 74 |
| 최대 프레임 시간 (ms) | 352 | 159 |

## 원본 측정 데이터

### Before (2026-06-02)

```json
{
  "domNodes": 39556,
  "cards": 1039,
  "heapMB": 42.6,
  "avgFrameMs": 30.5,
  "longFrames": 226,
  "maxFrameMs": 352,
  "totalFrames": 1719
}
```

### After (2026-06-03)

```json
{
  "domNodes": 1611,
  "cards": 40,
  "heapMB": 9.5,
  "avgFrameMs": 23.16,
  "longFrames": 74,
  "maxFrameMs": 159,
  "totalFrames": 1615
}
```

## 분석

### DOM 노드 / 렌더된 카드

가상화 적용 후 1,039개 전체 로드 완료 상태에서 DOM 노드가 **39,556 → 1,611** (약 **24배 감소**). 렌더된 카드는 **1,039 → 40** — 전체가 아닌 뷰포트 가시 영역 분량만 DOM에 유지된다. After의 `cards` 값(40)은 측정 시점의 스크롤 위치에 렌더된 카드 수이며, 가상화의 목적이 DOM을 뷰포트 분량으로 제한하는 것이므로 `cards ≪ 1,039`이면 정상이다.

### JS 힙

JS 힙 사용량이 **42.6 MB → 9.5 MB** (약 **4.5배 감소**). 가상화로 생성·유지되는 React 컴포넌트 인스턴스 수가 크게 줄어든 결과다.

### 프레임 시간 / long frame

- 평균 프레임 시간: **30.5 ms → 23.16 ms** (약 24% 개선)
- 50ms 초과 long frame: **226개 → 74개** (약 **67% 감소**)
- 최대 프레임 시간: **352 ms → 159 ms** (약 55% 감소)

### 구현 방식

라이브러리(react-virtual, @tanstack/virtual 등)를 사용하지 않고 직접 구현했다:

- `apps/web/src/lib/virtualizer.ts` — 순수 계산 코어(행 오프셋·가시 범위 계산), React·DOM 의존 없음
- `apps/web/src/hooks/useWindowVirtualizer.ts` — window scroll 이벤트를 구독해 가시 행 범위를 React state로 제공하는 훅

두 파일을 분리 설계해 코어 로직의 단독 테스트가 가능하고, 훅은 컴포넌트에서 `items`(행 배열)와 `offsetTop`만 받아 즉시 사용할 수 있다.
