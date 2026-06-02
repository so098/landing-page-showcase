import { describe, it, expect } from "vitest";
import {
  buildOffsets,
  totalHeight,
  findRowIndex,
  computeRange,
  getVirtualRows,
} from "./virtualizer";

describe("buildOffsets", () => {
  it("실측값이 없으면 추정값으로 누적합을 만든다", () => {
    // 3행 × 추정 100px → [0, 100, 200, 300]
    expect(buildOffsets(3, 100, new Map())).toEqual([0, 100, 200, 300]);
  });

  it("실측값이 있는 행은 실측값을 쓴다", () => {
    const measured = new Map([[1, 150]]);
    // [0, 100, 100+150, 250+100]
    expect(buildOffsets(3, 100, measured)).toEqual([0, 100, 250, 350]);
  });

  it("행이 0개면 [0]", () => {
    expect(buildOffsets(0, 100, new Map())).toEqual([0]);
  });
});

describe("totalHeight", () => {
  it("마지막 오프셋이 전체 높이다", () => {
    expect(totalHeight([0, 100, 250, 350])).toBe(350);
    expect(totalHeight([0])).toBe(0);
  });
});

describe("findRowIndex", () => {
  const offsets = [0, 100, 200, 300, 400]; // 4행, 각 100px

  it("y가 속한 행 인덱스를 찾는다 (이진 탐색)", () => {
    expect(findRowIndex(offsets, 0)).toBe(0);
    expect(findRowIndex(offsets, 99)).toBe(0);
    expect(findRowIndex(offsets, 100)).toBe(1);
    expect(findRowIndex(offsets, 250)).toBe(2);
    expect(findRowIndex(offsets, 399)).toBe(3);
  });

  it("범위를 벗어나면 경계로 클램프한다", () => {
    expect(findRowIndex(offsets, -50)).toBe(0);
    expect(findRowIndex(offsets, 99999)).toBe(3);
  });
});

describe("computeRange", () => {
  // 100행 × 100px, 뷰포트 500px
  const offsets = buildOffsets(100, 100, new Map());

  it("스크롤 0이면 첫 화면 행들 + overscan", () => {
    const r = computeRange({
      offsets,
      scrollY: 0,
      viewportHeight: 500,
      scrollMargin: 0,
      overscan: 2,
    });
    // 가시: 0~4행 (0~500px), overscan 위 0 아래 +2 → 0~6
    expect(r.start).toBe(0);
    expect(r.end).toBe(6);
  });

  it("중간으로 스크롤하면 해당 범위 + 위아래 overscan", () => {
    const r = computeRange({
      offsets,
      scrollY: 5000,
      viewportHeight: 500,
      scrollMargin: 0,
      overscan: 2,
    });
    // 가시: 50~54행, overscan → 48~56
    expect(r.start).toBe(48);
    expect(r.end).toBe(56);
  });

  it("scrollMargin(그리드 위 영역)을 보정한다", () => {
    const r = computeRange({
      offsets,
      scrollY: 1000,
      viewportHeight: 500,
      scrollMargin: 1000, // 그리드가 문서 1000px 지점에서 시작
      overscan: 0,
    });
    // 컨테이너 기준 0~500px → 0~4행
    expect(r.start).toBe(0);
    expect(r.end).toBe(4);
  });

  it("마지막 근처에서는 end가 마지막 행을 넘지 않는다", () => {
    const r = computeRange({
      offsets,
      scrollY: 9900,
      viewportHeight: 500,
      scrollMargin: 0,
      overscan: 3,
    });
    expect(r.end).toBe(99);
    expect(r.start).toBe(96); // 99(가시 시작) - 3 overscan
  });

  it("행이 없으면 빈 범위", () => {
    const r = computeRange({
      offsets: [0],
      scrollY: 0,
      viewportHeight: 500,
      scrollMargin: 0,
      overscan: 2,
    });
    expect(r.end).toBeLessThan(r.start);
  });
});

describe("getVirtualRows", () => {
  it("범위의 행들을 {index, start, height}로 반환한다", () => {
    const offsets = [0, 100, 250, 350];
    expect(getVirtualRows(offsets, { start: 1, end: 2 })).toEqual([
      { index: 1, start: 100, height: 150 },
      { index: 2, start: 250, height: 100 },
    ]);
  });

  it("빈 범위면 빈 배열", () => {
    expect(getVirtualRows([0, 100], { start: 0, end: -1 })).toEqual([]);
  });
});
