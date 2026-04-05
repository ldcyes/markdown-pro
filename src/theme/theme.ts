export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "markdown-pro:theme";

interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}
