import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "이용 안내",
  description:
    "디자인을 고르고 주문서를 작성하면 AI가 랜딩페이지를 만들어 드려요. 제작 흐름과 가격, 자주 묻는 질문을 확인하세요.",
  path: "/guide",
});

// 이용 안내 — 서비스 흐름을 그림(단계 + 비교 카드)으로 설명하는 페이지.
// 인터랙션이 없는 콘텐츠라 서버 컴포넌트(완전 정적, SSG)로 렌더한다.
// 헤더/채팅 위젯 같은 클라이언트 섬(island)만 클라이언트에서 하이드레이트된다.
export default function GuidePage() {
  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />

      {/* ── 타이틀 ── */}
      <section className="mx-auto max-w-3xl px-5 pb-4 pt-8 text-center sm:pt-14">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-accent/20 bg-white/70 px-4 py-1.5 text-xs font-semibold text-accent-deep shadow-soft">
          <span className="h-2 w-2 animate-float rounded-full bg-accent shadow-[0_0_8px_rgba(0,102,204,0.6)]" />
          이용 안내
        </span>
        <h1
          className="mt-6 animate-fade-up font-display text-3xl font-extrabold leading-[1.2] tracking-tight text-ink sm:text-5xl"
          style={{ animationDelay: "80ms" }}
        >
          이 홈페이지의 랜딩페이지는
          <br />
          <span className="text-accent">AI</span>로 만들어졌습니다
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-ink-muted/70"
          style={{ animationDelay: "160ms" }}
        >
          단돈 <strong className="text-accent">10,000원</strong>에 퀄리티 좋은 랜딩페이지를
          만들어 드리고, 개별 연락을 드려 호스팅과 도메인 연결까지 도와드려요.
        </p>
      </section>

      {/* ── 단계 플로우 ── */}
      <section className="mx-auto max-w-3xl px-5 pb-10 pt-12">
        <div className="relative flex flex-col gap-0">
          {/* 세로 연결선 */}
          <div className="absolute bottom-12 left-[27px] top-12 w-0.5 bg-gradient-to-b from-accent/40 via-accent/25 to-accent/40 sm:left-[31px]" />

          <Step
            no={1}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            }
            title="디자인 고르고 주문서 작성"
            badge="10,000원"
          >
            쇼케이스에서 마음에 드는 디자인을 고르고 주문서를 작성하면,
            <br className="hidden sm:block" />
            AI가 퀄리티 좋은 랜딩페이지를 만들어 드려요.
          </Step>

          <Arrow />

          <Step
            no={2}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
            }
            title="개별 연락 & 사이트 오픈"
          >
            페이지가 완성되면 <strong className="text-ink">개별 연락</strong>을 드려요.
            <br className="hidden sm:block" />
            호스팅과 도메인 연결까지 함께 도와드려서 바로 운영할 수 있어요.
          </Step>

          <Arrow />

          <Step
            no={3}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
            title="더 만들고 싶다면 — 추가로 주문하기"
          >
            만들어진 페이지를 보고 더 추가로 만들고 싶으면,
            <br className="hidden sm:block" />
            <strong className="text-accent">추가로 주문하기</strong>를 클릭하세요. 두 가지 방법 중
            고를 수 있어요.
          </Step>
        </div>
      </section>

      {/* ── 두 가지 방법 비교 ── */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* AI로 만들기 */}
          <PathCard
            emoji="🤖"
            name="AI로 바로 만들기"
            price="50,000원"
            accent="ai"
            steps={["공통 주문서 수정", "[생성] 버튼 클릭", "3~5분이면 완성"]}
            footer="빠르게, 바로 받아보고 싶을 때"
          />

          {/* 사람과 만들기 */}
          <PathCard
            emoji="👤"
            name="사람과 이야기하며 만들기"
            price="300,000원"
            accent="human"
            steps={["공통 주문서 수정", "사람에게 주문하기 클릭", "가능한 시간에 카톡으로 연락", "이야기 나누며 함께 제작"]}
            footer="꼼꼼하게, 상의하며 만들고 싶을 때"
          />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-muted/45">
          두 방법 모두 같은 주문서를 사용해요. AI 선택 시 바로 생성되고, 사람에게 주문하기를
          선택하면 가능한 시간에 카카오톡으로 연락드려요.
        </p>
      </section>

      {/* ── 공지사항 (아코디언) ── */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-10 px-5 pb-16">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink sm:text-3xl">
          공지사항
        </h2>
        <p className="mt-2 text-center text-sm text-ink-muted/60">
          자주 묻는 내용을 모았어요. 항목을 누르면 펼쳐져요.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Accordion title="도메인과 호스팅이란?" defaultOpen>
            <p>
              <strong className="text-ink">도메인</strong>은 내 웹사이트의 인터넷 주소예요.
              예를 들어 <span className="font-semibold text-accent">dalkom-bakery.com</span>{" "}
              같은 주소를 말해요. 고객이 이 주소를 입력하면 내 랜딩페이지로 들어올 수 있어요.
            </p>
            <p className="mt-3">
              <strong className="text-ink">호스팅</strong>은 만들어진 랜딩페이지를 인터넷에
              올려두는 서버 공간이에요. 호스팅이 있어야 24시간 누구나 내 페이지에 접속할 수
              있어요.
            </p>
            <p className="mt-3">
              <strong className="text-ink">호스팅</strong>은{" "}
              <span className="font-semibold text-accent">Netlify</span> 또는{" "}
              <span className="font-semibold text-accent">Vercel</span>로 올려드려요. 둘 다 빠르고
              안정적인 서비스라, 별도 서버 관리 없이 페이지를 24시간 안전하게 운영할 수 있어요.
            </p>
            <p className="mt-3">
              <strong className="text-ink">도메인</strong>은 이렇게 진행해요.
            </p>
            <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5">
              <li>
                사장님이 호스팅·도메인용 <strong className="text-ink">새 계정</strong>을 하나
                만들어 주세요 (가입은 저희가 화면을 보며 안내해 드려요).
              </li>
              <li>
                원하시는 도메인의 <strong className="text-ink">최소~최대 가격대</strong>를
                알려주세요. (도메인은 주소에 따라 가격이 달라요.)
              </li>
              <li>
                알려주신 가격대 안에서 랜딩,픽이{" "}
                <strong className="text-ink">후보 도메인 3개 정도</strong>를 찾아 전달해 드려요.
              </li>
              <li>그중 마음에 드는 주소를 하나 골라주시면, 연결까지 저희가 처리해 드려요.</li>
            </ol>
            <p className="mt-3">
              랜딩,픽은 페이지 생성이 완료되면 <strong className="text-ink">개별 연락</strong>을
              드려서 위 과정을 함께 진행해요. 어려운 부분은 저희가 다 처리해 드리니 걱정하지 않으셔도
              돼요.
            </p>
          </Accordion>

          <Accordion title="SEO 최적화는 어떻게 되나요?">
            <p>
              검색에 잘 노출되도록 <strong className="text-ink">SEO(검색엔진 최적화)</strong>를
              신경 써서 만들어 드려요. 랜딩,픽 페이지는 다음과 같은 기본기를 갖추고 있어요.
            </p>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
              <li>
                페이지마다 <strong className="text-ink">제목·설명 메타태그</strong>와{" "}
                <strong className="text-ink">OG 태그</strong>(카카오톡·페이스북 공유 시 보이는
                미리보기)를 채워 둬요.
              </li>
              <li>
                검색엔진이 내용을 그대로 읽을 수 있도록{" "}
                <strong className="text-ink">서버에서 미리 렌더링한 HTML</strong>로 만들어요.
              </li>
              <li>
                제목·문단·목록 등을 의미에 맞게 표시하는{" "}
                <strong className="text-ink">시맨틱 마크업</strong>을 사용해요.
              </li>
            </ul>
            <p className="mt-3">
              그리고 페이지가 검색에 등록되도록{" "}
              <strong className="text-ink">구글 서치 콘솔</strong>과{" "}
              <strong className="text-ink">네이버 서치어드바이저</strong> 등록까지 대행해 드려요.
            </p>
            <p className="mt-3 text-ink-muted/55">
              검색 순위를 끌어올리는 광고·키워드 컨설팅까지는 포함되지 않아요. 검색에 잘 잡히기
              위한 기본 설정과 등록까지 해드린다고 생각하시면 돼요.
            </p>
          </Accordion>

          <Accordion title="제작 기간은 얼마나 걸리나요?">
            <p>
              <strong className="text-ink">AI 제작</strong>은 주문서 작성 후 3~5분이면 완성돼요.
              <br />
              <strong className="text-ink">사람과 함께 만들기</strong>는 카카오톡 상담 후 보통
              3~7일 정도 걸려요.
            </p>
            <p className="mt-3">
              완성 후 도메인·호스팅 연결 연락은 <strong className="text-ink">최대 2일</strong> 안에
              드려요.
            </p>
          </Accordion>

          <Accordion title="수정은 어떻게 하나요?">
            <p>
              생성된 페이지의 결과 화면에서 <strong className="text-ink">수정하기</strong>를 누르면
              두 가지 방법 중 고를 수 있어요.
            </p>
            <p className="mt-3">
              🤖 <strong className="text-ink">AI 수정</strong> — 수정할 부분을 고르고 AI에게 직접
              말하면 2~3분 안에 반영돼요.
              <br />
              👤 <strong className="text-ink">사람 수정</strong> — 담당자가 연락드려 함께 수정해요
              (최대 이틀 소요).
            </p>
          </Accordion>

          <Accordion title="결제는 어떻게 하나요?">
            <p>
              지금은 주문서 접수 후 <strong className="text-ink">개별 연락</strong>을 드릴 때 결제
              안내를 함께 드려요. 첫 페이지 10,000원, 추가 제작은 AI 50,000원 / 사람과 함께
              300,000원이에요.
            </p>
          </Accordion>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-3xl px-5 pb-28 text-center">
        <div className="rounded-3xl border border-accent/15 bg-pearl p-8 shadow-soft sm:p-12">
          <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            지금 바로 시작해 보세요
          </h2>
          <p className="mt-3 text-sm text-ink-muted/65">
            첫 랜딩페이지는 단돈 <strong className="text-accent">10,000원</strong>이에요.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/showcase"
              className="rounded-full border border-accent/25 bg-white px-7 py-3.5 text-sm font-bold text-accent transition-all hover:border-accent hover:shadow-petal"
            >
              디자인 둘러보기
            </Link>
            <Link
              href="/order"
              className="rounded-full bg-accent-grad px-7 py-3.5 text-sm font-bold text-white shadow-petal transition-all hover:shadow-petalHover hover:brightness-105"
            >
              주문하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── 공지사항 아코디언 ── */
function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-accent/15 bg-pearl shadow-soft transition-shadow open:shadow-petal"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-base font-bold text-ink sm:text-lg">{title}</span>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-accent/20 bg-white text-ink-muted/60 transition-transform duration-300 group-open:rotate-180 group-open:border-accent group-open:text-accent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-accent/10 px-6 py-5 text-sm leading-relaxed text-ink-muted/70">
        {children}
      </div>
    </details>
  );
}

/* ── 플로우 단계 카드 ── */
function Step({
  no,
  icon,
  title,
  badge,
  children,
}: {
  no: number;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-start gap-5 sm:gap-7">
      {/* 번호 + 아이콘 */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-grad text-white shadow-petal sm:h-16 sm:w-16">
          {icon}
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 rounded-3xl border border-accent/15 bg-pearl p-5 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-display text-xs font-bold text-ink-muted/40">STEP {no}</span>
          {badge && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 font-display text-xs font-extrabold text-white shadow-sm">
              {badge}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 font-display text-lg font-extrabold leading-snug text-ink sm:text-xl">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted/65">{children}</p>
      </div>
    </div>
  );
}

/* ── 단계 사이 화살표 ── */
function Arrow() {
  return (
    <div className="relative z-10 flex justify-center py-3 pl-14 sm:pl-16">
      <svg className="text-accent/50" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    </div>
  );
}

/* ── 추가 주문 방법 비교 카드 ── */
function PathCard({
  emoji,
  name,
  price,
  accent,
  steps,
  footer,
}: {
  emoji: string;
  name: string;
  price: string;
  accent: "ai" | "human";
  steps: string[];
  footer: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-3xl border p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-petalHover sm:p-8 ${
        accent === "ai"
          ? "border-accent/30 bg-white ring-1 ring-accent/10"
          : "border-accent/15 bg-pearl"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{emoji}</span>
        {accent === "ai" && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
            빠른 제작
          </span>
        )}
      </div>
      <h3 className="mt-4 font-display text-xl font-extrabold text-ink">{name}</h3>
      <p className="mt-1 font-display text-3xl font-extrabold text-accent">{price}</p>

      {/* 미니 플로우 */}
      <div className="mt-6 flex flex-col">
        {steps.map((s, i) => (
          <div key={s}>
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold ${
                  accent === "ai" ? "bg-accent-grad text-white" : "bg-ink text-white"
                }`}
              >
                {i + 1}
              </span>
              <span className="text-sm font-medium text-ink-muted/75">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="ml-3 h-5 w-px bg-accent/25" />
            )}
          </div>
        ))}
      </div>

      <p className="mt-7 border-t border-accent/10 pt-4 text-xs text-ink-muted/50">{footer}</p>
    </div>
  );
}
