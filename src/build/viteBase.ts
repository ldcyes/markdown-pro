export function resolveViteBase(env: Record<string, string | undefined> = process.env) {
  return env.VITE_BASE_PATH || "./";
}
