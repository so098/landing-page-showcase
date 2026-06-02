// 가상화 순수 계산 코어 — DOM/React 의존 없음.
// 행 높이는 실측값(measured)이 있으면 그것을, 없으면 추정값(estimate)을 쓴다.
//
// 용어:
// - offsets: 누적합 테이블. offsets[i] = i번째 행의 시작 y (컨테이너 기준).
//   길이는 rowCount + 1이며 마지막 원소가 전체 높이.
// - scrollMargin: 그리드 컨테이너가 문서 상단에서 떨어진 거리 (헤더/타이틀 영역).

export type VirtualRow = {
  index: number;
  start: number; // 컨테이너 기준 y (px)
  height: number;
};

export type Range = { start: number; end: number }; // end < start 이면 빈 범위

export function buildOffsets(
  rowCount: number,
  estimateHeight: number,
  measured: Map<number, number>,
): number[] {
  const offsets = new Array<number>(rowCount + 1);
  offsets[0] = 0;
  for (let i = 0; i < rowCount; i++) {
    // 비정상 실측값(NaN/음수/0)은 무시 — offsets의 단조 증가(이진 탐색 전제)를 보장
    const h = measured.get(i);
    offsets[i + 1] =
      offsets[i] + (h !== undefined && Number.isFinite(h) && h > 0 ? h : estimateHeight);
  }
  return offsets;
}

export function totalHeight(offsets: number[]): number {
  return offsets[offsets.length - 1] ?? 0;
}

// offsets에서 y가 속한 행 인덱스 (이진 탐색). 범위 밖이면 경계로 클램프.
export function findRowIndex(offsets: number[], y: number): number {
  const rowCount = offsets.length - 1;
  if (rowCount <= 0) return 0;
  if (y < offsets[1]) return 0;
  if (y >= offsets[rowCount]) return rowCount - 1;

  let lo = 0;
  let hi = rowCount - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid + 1] <= y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function computeRange(args: {
  offsets: number[];
  scrollY: number;
  viewportHeight: number;
  scrollMargin: number;
  overscan: number;
}): Range {
  const { offsets, scrollY, viewportHeight, scrollMargin, overscan } = args;
  const rowCount = offsets.length - 1;
  if (rowCount <= 0) return { start: 0, end: -1 };

  // 컨테이너 기준 가시 구간
  const top = scrollY - scrollMargin;
  const bottom = top + viewportHeight;

  const start = Math.max(0, findRowIndex(offsets, top) - overscan);
  // bottom은 exclusive (뷰포트 끝 픽셀은 포함 안 됨), 따라서 -1로 마지막 visible row를 구한다
  const end = Math.min(rowCount - 1, findRowIndex(offsets, bottom - 1) + overscan);
  return { start, end };
}

export function getVirtualRows(offsets: number[], range: Range): VirtualRow[] {
  const rows: VirtualRow[] = [];
  for (let i = range.start; i <= range.end; i++) {
    rows.push({
      index: i,
      start: offsets[i],
      height: offsets[i + 1] - offsets[i],
    });
  }
  return rows;
}
