import { useEffect, useState } from "react";
import { Editor } from "./editor/Editor";
import {
  applyTheme,
  getSystemPrefersDark,
  getThemeChrome,
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
    const chrome = getThemeChrome(theme);
    applyTheme(theme);
    writeStoredTheme(theme);
    document.body.style.backgroundColor = chrome.documentBackground;
    document.body.style.backgroundImage = chrome.documentBackgroundImage;
    const root = document.getElementById("root");
    if (root) {
      root.style.backgroundColor = chrome.documentBackground;
      root.style.backgroundImage = chrome.documentBackgroundImage;
    }

    void import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        const currentWindow = getCurrentWindow() as ReturnType<typeof getCurrentWindow> & {
          setBackgroundColor?: (color: [number, number, number, number]) => Promise<void>;
        };

        const updates: Promise<unknown>[] = [currentWindow.setTheme(theme)];
        if (typeof currentWindow.setBackgroundColor === "function") {
          updates.push(currentWindow.setBackgroundColor(chrome.windowBackground));
        }

        return Promise.allSettled(updates);
      })
      .catch(() => {
        // Browser builds do not expose Tauri window APIs.
      });
  }, [theme]);

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_38%),linear-gradient(180deg,#f8f5ef_0%,#f0ece4_100%)] text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.08),transparent_32%),linear-gradient(180deg,#111827_0%,#0f172a_100%)] dark:text-slate-100">
      <Editor theme={theme} onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
    </main>
  );
}
