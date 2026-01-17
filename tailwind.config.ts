import type { Config } from "tailwindcss";

export default {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                apple: {
                    gray: {
                        50: '#f5f5f7',
                        100: '#e8e8ed',
                        200: '#d2d2d7',
                        300: '#b0b0b5',
                        800: '#1d1d1f',
                        900: '#000000',
                    },
                    blue: '#0071e3',
                }
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.6s ease-out forwards',
            },
        },
    },
    plugins: [],
} satisfies Config;
