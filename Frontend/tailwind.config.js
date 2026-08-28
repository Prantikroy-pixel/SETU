/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#001736",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#001736",
          700: "#000f24",
          800: "#000918",
          900: "#00040a"
        },
        "primary-container": "#002b5b",
        "on-primary": "#ffffff",
        "on-primary-container": "#7594ca",
        "primary-fixed": "#d6e3ff",
        "primary-fixed-dim": "#a9c7ff",
        "on-primary-fixed": "#001b3d",
        "on-primary-fixed-variant": "#264778",
        "inverse-primary": "#a9c7ff",

        "secondary": "#006591",
        "secondary-container": "#39b8fd",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#004666",
        "secondary-fixed": "#c9e6ff",
        "secondary-fixed-dim": "#89ceff",
        "on-secondary-fixed": "#001e2f",
        "on-secondary-fixed-variant": "#004c6e",

        "tertiary": "#2f0c00",
        "tertiary-container": "#4f1c02",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#cd805d",
        "tertiary-fixed": "#ffdbcd",
        "tertiary-fixed-dim": "#ffb596",
        "on-tertiary-fixed": "#360f00",
        "on-tertiary-fixed-variant": "#713619",

        "background": "#faf9fe",
        "on-background": "#1a1c1f",
        "surface": "#faf9fe",
        "on-surface": "#1a1c1f",
        "surface-variant": "#e3e2e7",
        "on-surface-variant": "#43474f",
        "surface-dim": "#dad9de",
        "surface-bright": "#faf9fe",

        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f4f3f8",
        "surface-container": "#eeedf2",
        "surface-container-high": "#e8e7ec",
        "surface-container-highest": "#e3e2e7",

        "inverse-surface": "#2f3034",
        "inverse-on-surface": "#f1f0f5",
        "surface-tint": "#405f91",

        "outline": "#747780",
        "outline-variant": "#c4c6d0",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        "status-optimal": "#10B981",
        "status-moderate": "#F59E0B",
        "status-critical": "#DC2626",

        "command-bg-start": "#F0F9FF",
        "command-bg-end": "#FFFFFF"
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        full: "9999px"
      },
      spacing: {
        "stack-loose": "1rem",
        "card-padding": "1.5rem",
        "section-gap": "2.5rem",
        "grid-margin": "2rem",
        "stack-tight": "0.5rem",
        "gutter": "1.5rem"
      },
      fontFamily: {
        "body-md": ["Hanken Grotesk", "sans-serif"],
        "headline-sm": ["Manrope", "sans-serif"],
        "headline-md": ["Manrope", "sans-serif"],
        "body-sm": ["Hanken Grotesk", "sans-serif"],
        "display-command": ["Manrope", "sans-serif"],
        "label-caps": ["Hanken Grotesk", "sans-serif"],
        "metric-value": ["Manrope", "sans-serif"],
        "headline-lg": ["Manrope", "sans-serif"],
        "body-lg": ["Hanken Grotesk", "sans-serif"]
      },
      fontSize: {
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "display-command": ["40px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "800" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "700" }],
        "metric-value": ["28px", { lineHeight: "1.1", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }]
      }
    },
  },
  plugins: [],
}
