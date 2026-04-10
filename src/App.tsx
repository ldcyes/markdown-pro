import { useEffect, useState } from "react";
import { Editor } from "./editor/Editor";
import {
  applyTheme,
  getSystemPrefersDark,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
  type ThemeMode,
} from "./theme/theme.js";

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() =>
    resolveTheme(readStoredTheme(), getSystemPrefersDark()),
  );

  useEffect(() => {
    applyTheme(theme);
    writeStoredTheme(theme);
    document.body.style.backgroundColor = theme === "dark" ? "#111827" : "#f8f5ef";
    const root = document.getElementById("root");
    if (root) root.style.backgroundColor = theme === "dark" ? "#111827" : "#f8f5ef";
  }, [theme]);

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_38%),linear-gradient(180deg,#f8f5ef_0%,#f0ece4_100%)] text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.08),transparent_32%),linear-gradient(180deg,#111827_0%,#0f172a_100%)] dark:text-slate-100">
      <Editor theme={theme} onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
    </main>
  );
}
