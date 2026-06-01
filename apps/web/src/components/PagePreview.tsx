import Image from "next/image";
import type { Showcase } from "@melstudio/shared";
import PlaceholderMock from "./PlaceholderMock";

// 미리보기 렌더 우선순위:
// 1) 경로(desktop/mobile/thumb)가 있고 interactive=true → iframe (내부 스크롤 가능, 실제 페이지/이미지 삽입용)
// 2) 경로가 있고 interactive=false → <Image> (카드 썸네일 등 정적 표시)
// 3) 경로가 없으면 → 미니 목업 플레이스홀더
// 부모 컨테이너를 가득 채웁니다 (부모는 position: relative + 크기 지정 필요).

type Variant = "desktop" | "mobile";

export default function PagePreview({
  item,
  variant,
  priority = false,
  interactive = false,
}: {
  item: Showcase;
  variant: Variant;
  priority?: boolean;
  interactive?: boolean;
}) {
  const src = variant === "mobile" ? item.mobile : item.desktop ?? item.thumb;

  if (src && interactive) {
    return (
      <iframe
        src={src}
        title={`${item.title} ${variant === "mobile" ? "모바일" : "데스크탑"} 미리보기`}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
      />
    );
  }

  if (src) {
    return (
      <Image
        src={src}
        alt={`${item.title} ${variant === "mobile" ? "모바일" : "데스크탑"} 미리보기`}
        fill
        sizes={variant === "mobile" ? "320px" : "(max-width: 768px) 100vw, 760px"}
        className="object-cover object-top"
        priority={priority}
      />
    );
  }

  return (
    <div className="absolute inset-0">
      <PlaceholderMock item={item} variant={variant} />
    </div>
  );
}
