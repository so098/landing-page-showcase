import { vi } from "vitest";

// next/image 목 — jsdom에서는 일반 img로 렌더
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, priority: _priority, sizes: _sizes, alt, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={(alt as string) ?? ""} {...rest} />;
  },
}));

// next/link 목 — 일반 a 태그로 렌더
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// IntersectionObserver 목 (무한스크롤 센티널용)
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// scrollIntoView / scrollTo 목
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// matchMedia 목 — 기본: 아무 쿼리도 매치 안 됨 (모바일 2열).
// 개별 테스트에서 window.matchMedia를 다시 목킹해 브레이크포인트를 시뮬레이션한다.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })),
});

// ResizeObserver 목 (행 높이 실측용) — 테스트에서 인스턴스에 접근할 수 있게 전역 목록 유지
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observed: Element[] = [];
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    this.observed = [];
  }
  // 테스트 헬퍼: 측정값을 강제로 발생시킨다
  trigger(height: number) {
    this.callback(
      this.observed.map((el) => ({
        target: el,
        contentRect: { height } as DOMRectReadOnly,
      })) as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver,
    );
  }
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});
// 테스트에서 import 없이 접근: (window as any).__MockResizeObserver
(window as unknown as Record<string, unknown>).__MockResizeObserver = MockResizeObserver;
