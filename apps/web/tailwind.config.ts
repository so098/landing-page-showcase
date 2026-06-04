import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 텍스트
        ink: "#1D1D1F", // 헤드라인·본문 (near-black, 순수 검정 대신)
        "ink-muted": "#333333", // 보조 텍스트
        // 단일 액센트 블루 — 모든 "클릭 가능" 신호는 이 색 하나로
        accent: {
          DEFAULT: "#0066CC",
          deep: "#0071E3", // focus 링
          sky: "#2997FF", // 다크 표면 위 인라인 링크 (기본 블루는 묻힘)
        },
        chip: "#D2D2D7", // 사진 위 반투명 원형 컨트롤 칩 베이스
        // 표면
        canvas: "#F5F5F7", // off-white parchment 표면 (흰색과 리듬용 미세 대비)
        pearl: "#FAFAFC", // 펄 버튼 표면 (canvas 위에서도 버튼으로 읽히도록 더 밝게)
        "surface-dark": "#272729", // 다크 타일
        "surface-dark-2": "#2A2A2C", // 다크 타일이 연속될 때 미세 분리용
        // 보더/구분선
        divider: "#F0F0F0", // 약한 구분선 (하드 라인보다 링 섀도에 가까움)
        hairline: "#E0E0E0", // 1px 헤어라인 보더
      },
      fontFamily: {
        display: [
          '"Noto Sans KR"',
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        body: [
          '"Noto Sans KR"',
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      boxShadow: {
        petal: "none",
        petalHover: "none",
        soft: "none",
        product: "3px 5px 30px 0 rgba(0, 0, 0, 0.22)",
      },
      backgroundImage: {
        "accent-grad": "linear-gradient(135deg, #0066CC 0%, #0066CC 100%)",
        "accent-grad-deep": "linear-gradient(135deg, #0066CC 0%, #0066CC 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "modal-in": {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.5s ease both",
        "modal-in": "modal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in": "slide-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
