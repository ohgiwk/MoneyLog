import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // アプリのテーマカラー: Tailwindの生の色名を直接使わず、
        // 用途ベースのエイリアスに寄せることで一括変更しやすくする
        primary: colors.emerald, // ブランド/プライマリ操作（確定・選択状態・収入系）
        danger: colors.rose, // 削除・支出系のマイナス表示
        warning: colors.amber, // 警告・注意喚起
      },
    },
  },
  plugins: [],
};
