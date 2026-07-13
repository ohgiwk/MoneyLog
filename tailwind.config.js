import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // アプリのテーマカラー: Tailwindの生の色名を直接使わず、
        // 用途ベースのエイリアスに寄せることで一括変更しやすくする
        income: colors.emerald, // 収入・プラス・黒字の表示色（緑）
        primary: {
          // アイコンの黄色 #f6a604 を 500 に据えたカスタムパレット
          50:  "#fffce8",
          100: "#fef3c0",
          200: "#fde490",
          300: "#fccf50",
          400: "#f9b91c",
          500: "#f6a604", // ブランドイエロー
          600: "#cc8500",
          700: "#9a6300",
          800: "#6e4600",
          900: "#452b00",
          950: "#251700",
        },
        navy: {
          // アイコンの紺色 #012664 を 900 に据えたカスタムパレット
          50:  "#e8eef8",
          100: "#c3d1ed",
          200: "#96adde",
          300: "#6389ce",
          400: "#3b6bbf",
          500: "#1a4fa8",
          600: "#103e8c",
          700: "#0a2e70",
          800: "#051f57",
          900: "#012664", // ブランドネイビー
          950: "#010f2e",
        },
        danger: colors.rose, // 削除・支出系のマイナス表示
        warning: colors.amber, // 警告・注意喚起

        // ニュートラル（背景・文字・枠線）: CSS変数経由で参照することで、
        // .dark クラスが付いたときに一括で配色を反転できるようにする
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)", // カード等の前面
          subtle: "rgb(var(--color-surface-subtle) / <alpha-value>)", // ページ背景・凹んだ背景
          hover: "rgb(var(--color-surface-hover) / <alpha-value>)", // ホバー/押下時の背景
          muted: "rgb(var(--color-surface-muted) / <alpha-value>)", // 無効状態・非アクティブな塗り
          strong: "rgb(var(--color-surface-strong) / <alpha-value>)", // 選択中セグメント等の濃い塗り
        },
        line: {
          DEFAULT: "rgb(var(--color-line) / <alpha-value>)", // 標準の枠線
          subtle: "rgb(var(--color-line-subtle) / <alpha-value>)", // 目立たない区切り線
          strong: "rgb(var(--color-line-strong) / <alpha-value>)", // 強調・選択状態の枠線
        },
        ink: {
          strong: "rgb(var(--color-ink-strong) / <alpha-value>)", // 見出し等の最も強い文字
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)", // 本文の標準文字
          muted: "rgb(var(--color-ink-muted) / <alpha-value>)", // 補足・プレースホルダー文字
          subtle: "rgb(var(--color-ink-subtle) / <alpha-value>)", // 装飾的な最も薄い文字
        },
      },
    },
  },
  plugins: [],
};
