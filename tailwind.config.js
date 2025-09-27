import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        mobile: { max: "767px" },
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }],
      },
      colors: {
        primary: { DEFAULT: "#FC8500", foreground: "#000000" },
        secondary: { DEFAULT: "#7E7FE7", foreground: "#000000" },
        tertiary: { DEFAULT: "#FCC018", foreground: "#000000" },
        "apple-gray": { 300: "#DFDFDF", 500: "#AFAFAF", 700: "#6b6b6b" },
        "apple-blue": { 300: "#C9E6FE", 500: "#1D9BF6", 700: "#1D6AA1" },
        "apple-purple": { 300: "#EACDF4", 500: "#AF38D1", 700: "#762C8B" },
        "apple-green": { 300: "#D4F6C9", 500: "#4AD321", 700: "#3E8522" },
        "apple-orange": { 300: "#FEDBC4", 500: "#FA6D0D", 700: "#A75117" },
        "apple-yellow": { 300: "#FDEEC3", 500: "#FCB80F", 700: "#936E10" },
        "apple-brown": { 300: "#DFD8CF", 500: "#7D5E3B", 700: "#5E4D39" },
        "apple-red": { 300: "#FEBFD1", 500: "#F50445", 700: "#BB1644" },
        "not-found": { 300: "#D3D3D3", 500: "#000000", 700: "#000000" },
      },
      fontFamily: {
        "noto-emoji": ['"Noto Color Emoji"', "sans-serif"],
      },
    },
  },
  darkMode: "media",
  plugins: [heroui()],
};
