import Image from "next/image";
import type { Showcase } from "@melstudio/shared";
import PlaceholderMock from "./PlaceholderMock";

// 실제 스크린샷 경로가 있으면 <Image>, 없으면 미니 목업 플레이스홀더를 렌더.
// 부모 컨테이너를 가득 채웁니다 (부모는 position: relative + 크기 지정 필요).

type Variant = "desktop" | "mobile";

export default function PagePreview({
  item,
  variant,
  priority = false,
}: {
  item: Showcase;
  variant: Variant;
  priority?: boolean;
}) {
  const src = variant === "mobile" ? item.mobile : item.desktop ?? item.thumb;

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
