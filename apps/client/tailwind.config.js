// @ts-check

/** @type {import("tailwindcss/types").Config } */
module.exports = {
  content: [
    "./node_modules/pliny/**/*.js",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,tsx}",
    "./src/layouts/**/*.{js,ts,tsx}",
    "./src/data/**/*.mdx",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        // Single accent against a neutral ground. Light uses 600 (6.1:1 on
        // white), dark uses 300 (10.1:1 on the dark ground); both clear AA.
        accent: {
          50: "#eff4fe",
          100: "#dce7fd",
          200: "#c1d5fc",
          300: "#96baf9",
          400: "#6496f4",
          500: "#3e74ec",
          600: "#2556da",
          700: "#1e45b0",
          800: "#1e3c8b",
          900: "#1e366f",
          950: "#152245",
        },
      },
      maxWidth: {
        measure: "68ch",
      },
      // One authored entrance, used on the home introduction only.
      // The reduced-motion block in tailwind.css collapses it to nothing.
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        rise: "rise 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        // One elevation step, with a real offset and blur.
        raise: "0 1px 2px 0 rgb(9 9 11 / 0.06), 0 4px 12px -2px rgb(9 9 11 / 0.08)",
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": theme("colors.zinc.700"),
            "--tw-prose-headings": theme("colors.zinc.900"),
            "--tw-prose-links": theme("colors.accent.600"),
            "--tw-prose-bold": theme("colors.zinc.900"),
            "--tw-prose-quotes": theme("colors.zinc.700"),
            "--tw-prose-hr": theme("colors.zinc.200"),
            maxWidth: "none",
            a: {
              fontWeight: "400",
              textDecorationThickness: "1px",
              textUnderlineOffset: "3px",
              "&:hover": { color: theme("colors.accent.700") },
            },
            "h2, h3": {
              letterSpacing: "-0.011em",
              // More space above a heading than below it.
              marginTop: "2.5em",
              marginBottom: "0.75em",
            },
            code: {
              fontWeight: "400",
              color: theme("colors.zinc.800"),
              backgroundColor: theme("colors.zinc.100"),
              padding: "0.15em 0.35em",
              borderRadius: "4px",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            "pre code": {
              backgroundColor: "transparent",
              padding: "0",
            },
          },
        },
        invert: {
          css: {
            "--tw-prose-body": theme("colors.zinc.300"),
            "--tw-prose-headings": theme("colors.zinc.50"),
            "--tw-prose-links": theme("colors.accent.300"),
            "--tw-prose-bold": theme("colors.zinc.50"),
            "--tw-prose-quotes": theme("colors.zinc.300"),
            "--tw-prose-hr": theme("colors.zinc.800"),
            a: {
              "&:hover": { color: theme("colors.accent.200") },
            },
            code: {
              color: theme("colors.zinc.200"),
              backgroundColor: theme("colors.zinc.800"),
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
