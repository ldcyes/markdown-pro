export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "markdown-pro:theme";

interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ThemeChrome {
  documentBackground: string;
  documentBackgroundImage: string;
  themeColor: string;
  windowBackground: [number, number, number, number];
}

export function resolveTheme(
  storedTheme: string | null,
  prefersDark: boolean,
): ThemeMode {
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return prefersDark ? "dark" : "light";
}

export function persistTheme(
  storage: ThemeStorage,
  theme: ThemeMode,
  key = THEME_STORAGE_KEY,
): ThemeMode {
  storage.setItem(key, theme);
  return theme;
}

export function getSystemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function readStoredTheme(key = THEME_STORAGE_KEY): string | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: ThemeMode, key = THEME_STORAGE_KEY) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return theme;
  }

  try {
    return persistTheme(window.localStorage, theme, key);
  } catch {
    return theme;
  }
}

export function getThemeChrome(theme: ThemeMode): ThemeChrome {
  if (theme === "dark") {
    return {
      documentBackground: "#0f172a",
      documentBackgroundImage: "radial-gradient(circle at top, rgba(245, 158, 11, 0.08), transparent 32%), linear-gradient(180deg, #111827 0%, #0f172a 100%)",
      themeColor: "#111827",
      windowBackground: [17, 24, 39, 255],
    };
  }

  return {
    documentBackground: "#f0ece4",
    documentBackgroundImage: "radial-gradient(circle at top, rgba(251, 191, 36, 0.12), transparent 38%), linear-gradient(180deg, #f8f5ef 0%, #f0ece4 100%)",
    themeColor: "#f8f5ef",
    windowBackground: [248, 245, 239, 255],
  };
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const chrome = getThemeChrome(theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.backgroundColor = chrome.documentBackground;
  document.documentElement.style.backgroundImage = chrome.documentBackgroundImage;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]') ?? document.createElement("meta");
  themeColorMeta.setAttribute("name", "theme-color");
  themeColorMeta.setAttribute("content", chrome.themeColor);
  if (!themeColorMeta.parentNode) {
    document.head.appendChild(themeColorMeta);
  }
}
