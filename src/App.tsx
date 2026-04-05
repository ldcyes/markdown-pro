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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_38%),linear-gradient(180deg,#fbf7ef_0%,#f4efe4_100%)] text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_32%),linear-gradient(180deg,#111827_0%,#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto w-[min(1040px,calc(100%-32px))] py-12 md:py-16">
        <section className="mb-6 flex flex-col gap-6 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-700 dark:text-amber-300/80">
              Markdown Pro
            </p>
            <h1 className="font-['Iowan_Old_Style','Palatino_Linotype',serif] text-[clamp(2.25rem,5vw,4rem)] leading-[0.96] tracking-[-0.04em]">
              Markdown editing with file workflow, outline navigation, and theme-aware polish.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Phase 1 now runs on a Markdown source of truth: open local files,
              auto-save drafts, format with a toolbar, navigate headings from a
              live outline, and switch between warm paper and midnight canvas.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-3 self-start rounded-full border border-amber-800/10 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_30px_rgba(120,53,15,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-amber-700/25 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:shadow-[0_18px_30px_rgba(2,6,23,0.34)]"
            onClick={() => setTheme(nextTheme)}
          >
            {theme === "dark" ? (
              <SunMedium size={18} strokeWidth={2.1} />
            ) : (
              <MoonStar size={18} strokeWidth={2.1} />
            )}
            <span>Switch to {nextTheme} mode</span>
          </button>
        </section>
        <Editor />
      </div>
    </main>
  );
}
