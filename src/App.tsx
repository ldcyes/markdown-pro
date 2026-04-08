import { MoonStar, SunMedium } from "lucide-react";
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
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <main className="h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_38%),linear-gradient(180deg,#f8f5ef_0%,#f0ece4_100%)] text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.08),transparent_32%),linear-gradient(180deg,#111827_0%,#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto flex h-full w-[min(1200px,calc(100%-24px))] flex-col gap-2 py-3">
        <section className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300/80">
            Markdown Pro
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-amber-800/10 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur transition hover:-translate-y-0.5 hover:border-amber-700/25 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
            onClick={() => setTheme(nextTheme)}
          >
            {theme === "dark" ? (
              <SunMedium size={14} strokeWidth={2.1} />
            ) : (
              <MoonStar size={14} strokeWidth={2.1} />
            )}
            <span>{nextTheme === "dark" ? "Dark" : "Light"}</span>
          </button>
        </section>
        <Editor />
      </div>
    </main>
  );
}
