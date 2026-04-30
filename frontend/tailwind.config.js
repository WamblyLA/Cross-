export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        chrome: "var(--bg-chrome)",
        panel: "var(--bg-panel)",
        editor: "var(--bg-editor)",
        input: "var(--bg-input)",
        hover: "var(--bg-hover)",
        active: "var(--bg-active)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        inverse: "var(--text-inverse)",
        default: "var(--border-default)",
        strong: "var(--border-strong)",
        focus: "var(--border-focus)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        overlay: "var(--shadow-overlay)",
      },
    },
  },
  plugins: [],
}
