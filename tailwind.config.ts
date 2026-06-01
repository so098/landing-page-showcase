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
        // 차분한 azure–navy 톤온톤 (채도 낮춘 세련된 블루)
        blush: "#EBF0F4", // 페이지 배경 (쿨 그레이 톤)
        cream: "#F5F8FB",
        ink: "#0A2540", // 딥 네이비 텍스트
        wine: "#23476E", // 보조 텍스트
        crimson: {
          DEFAULT: "#1565D8", // 메인 azure
          deep: "#0E4CA8",
        },
        rose: {
          DEFAULT: "#2D7FF0",
          light: "#5B9DF5",
          soft: "#A9CBF7",
        },
        petal: "#CCE0F7", // 옅은 칩 배경
        petalSoft: "#E4EEFA",
        sun: {
          DEFAULT: "#F4A82C", // 절제된 앰버 포인트
          soft: "#FBD79A",
        },
      },
      fontFamily: {
        display: ['"Gothic A1"', '"IBM Plex Sans KR"', "system-ui", "sans-serif"],
        body: ['"IBM Plex Sans KR"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        petal: "0 16px 40px -22px rgba(10, 37, 64, 0.3)",
        petalHover: "0 28px 60px -26px rgba(21, 101, 216, 0.4)",
        soft: "0 6px 24px -14px rgba(10, 37, 64, 0.2)",
      },
      backgroundImage: {
        // 가까운 두 톤의 절제된 그라데이션 (거의 솔리드처럼)
        "rose-grad": "linear-gradient(135deg, #1565D8 0%, #2D7FF0 100%)",
        "rose-grad-deep": "linear-gradient(135deg, #0E4CA8 0%, #2D7FF0 100%)",
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
