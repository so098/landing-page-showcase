# /showcase 가상화 성능 측정 — Before / After

- 관련 스펙: [2026-06-02-showcase-virtualization-design.md](../superpowers/specs/2026-06-02-showcase-virtualization-design.md)
- 측정 도구: Playwright (`apps/web/e2e/measure.spec.ts`), Chromium, 뷰포트 1280×800
- 조건: **동일 시드 1,039개**, 프로덕션 빌드(`next build && next start`), workers=1
- 방법: 끝까지 스크롤(전체 로드) → 위로 끝까지 → 다시 아래로 스크롤하며 프레임 수집

## 결과

| 지표 | Before (가상화 없음) | After (가상화) |
|---|---|---|
| 측정일 | 2026-06-02 | – |
| DOM 노드 수 (전체 로드 후) | 39,556 | – |
| 렌더된 카드 수 | 1,039 (= 전체) | – |
| JS 힙 (MB) | 42.6 | – |
| 평균 프레임 시간 (ms) | 30.5 | – |
| 50ms 초과 long frame 수 | 226 | – |
| 최대 프레임 시간 (ms) | 352 | – |

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

## 분석

(After 측정 후 작성)
