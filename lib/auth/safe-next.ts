export function safeNext(value: string | null | undefined, fallback = "/app") { return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback; }
export function authContinuationPath(value: string | null | undefined) { return safeNext(value, "/app"); }
