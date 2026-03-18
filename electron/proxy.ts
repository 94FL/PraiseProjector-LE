import { app, ipcMain } from "electron";
import axios from "axios";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";

type ProxyConfig = {
  cloudApiHost?: string;
  proxyAllowedHosts?: string[];
};

let cachedProxyConfig: ProxyConfig | null = null;

const loadProxyConfig = (): ProxyConfig => {
  if (cachedProxyConfig) return cachedProxyConfig;

  const candidates: string[] = [];
  if (app.isPackaged) {
    candidates.push(path.join(app.getPath("userData"), "proxy-config.json"));
    candidates.push(path.join(path.dirname(app.getPath("exe")), "proxy-config.json"));
    candidates.push(path.join(app.getAppPath(), "proxy-config.json"));
  }
  candidates.push(path.join(process.cwd(), "proxy-config.json"));

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8")) as ProxyConfig;
      cachedProxyConfig = {
        cloudApiHost: typeof parsed.cloudApiHost === "string" ? parsed.cloudApiHost.trim() : "",
        proxyAllowedHosts: Array.isArray(parsed.proxyAllowedHosts)
          ? parsed.proxyAllowedHosts.map((host) => String(host).trim().toLowerCase()).filter((host) => host.length > 0)
          : [],
      };
      return cachedProxyConfig;
    } catch {
      // ignore and try next candidate
    }
  }

  cachedProxyConfig = { cloudApiHost: "", proxyAllowedHosts: [] };
  return cachedProxyConfig;
};

export const getProxyConfigValue = (key: string): string => {
  const config = loadProxyConfig();
  if (key === "VITE_CLOUD_API_HOST") return config.cloudApiHost || "";
  if (key === "PP_PROXY_ALLOWED_HOSTS") return (config.proxyAllowedHosts || []).join(",");
  return "";
};

const getProdAllowedHosts = (): Set<string> => {
  const raw = getProxyConfigValue("PP_PROXY_ALLOWED_HOSTS");
  const hosts = raw
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter((host) => host.length > 0);

  // Convenience fallback: derive from VITE_CLOUD_API_HOST if explicit list not provided.
  if (hosts.length === 0) {
    const cloudApiHost = getProxyConfigValue("VITE_CLOUD_API_HOST");
    if (cloudApiHost) {
      try {
        const hostname = new URL(cloudApiHost).hostname.toLowerCase();
        if (hostname) hosts.push(hostname);
      } catch {
        // ignore malformed URL and keep list empty
      }
    }
  }

  return new Set(hosts);
};

const isPrivateOrLocalAddress = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  if (normalized === "localhost" || normalized === "::1") return true;

  const ipVersion = net.isIP(normalized);
  if (!ipVersion) return false;

  if (ipVersion === 4) {
    if (normalized.startsWith("10.")) return true;
    if (normalized.startsWith("127.")) return true;
    if (normalized.startsWith("192.168.")) return true;

    const secondOctet = Number(normalized.split(".")[1]);
    if (normalized.startsWith("172.") && secondOctet >= 16 && secondOctet <= 31) return true;
    return false;
  }

  // IPv6
  return normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized === "::1";
};

const validateProxyTarget = (baseUrl: string): { ok: boolean; error?: string } => {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { ok: false, error: "Invalid base URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only HTTP(S) proxy targets are allowed" };
  }

  const host = parsed.hostname.toLowerCase();
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  const prodAllowedHosts = getProdAllowedHosts();

  if (isDev && isPrivateOrLocalAddress(host)) {
    return { ok: true };
  }

  // Always block private/local destinations outside dev mode.
  if (isPrivateOrLocalAddress(host)) {
    return { ok: false, error: `Private or local proxy target not allowed: ${host}` };
  }

  // Optional production allowlist via environment variable.
  // If PP_PROXY_ALLOWED_HOSTS is unset, any public host is allowed.
  if (prodAllowedHosts.size === 0 || prodAllowedHosts.has(host)) {
    return { ok: true };
  }

  return { ok: false, error: `Proxy target host not allowed: ${host}` };
};

// ─── In-memory cookie jar ──────────────────────────────────────────────────
// Minimal cookie handling so that HttpOnly Set-Cookie headers (especially the
// pp_refresh token) survive across requests — matching browser behaviour.
// Cookies are keyed by origin (scheme + host + port).
// Optionally persisted to disk when user opts into "Remember Me".

/** name → value */
type CookieMap = Map<string, string>;

/** origin → CookieMap */
const cookieJar = new Map<string, CookieMap>();

/** Path to persisted cookie file. Resolved lazily after app is ready. */
let cookieFilePath = "";

/** When true, cookie jar changes are automatically written to disk. */
let cookiePersistenceEnabled = false;

function getCookieFilePath(): string {
  if (!cookieFilePath) {
    cookieFilePath = path.join(app.getPath("userData"), "pp-cookies.json");
  }
  return cookieFilePath;
}

/** Load persisted cookies from disk into the in-memory jar (called once at init). */
function loadPersistedCookies(): void {
  try {
    const filePath = getCookieFilePath();
    if (!fs.existsSync(filePath)) return;
    const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, Record<string, string>>;
    for (const [origin, cookies] of Object.entries(data)) {
      const jar = new Map<string, string>();
      for (const [name, value] of Object.entries(cookies)) {
        jar.set(name, value);
      }
      cookieJar.set(origin, jar);
    }
    cookiePersistenceEnabled = true;
    console.log(`[Proxy Cookie] Loaded persisted cookies for ${Object.keys(data).length} origin(s) — auto-persist enabled`);
  } catch {
    // Ignore parse/read errors — start with empty jar
  }
}

/** Persist the current in-memory cookie jar to disk. */
function persistCookiesToDisk(): void {
  try {
    const data: Record<string, Record<string, string>> = {};
    for (const [origin, jar] of cookieJar.entries()) {
      const cookies: Record<string, string> = {};
      for (const [name, value] of jar.entries()) {
        cookies[name] = value;
      }
      data[origin] = cookies;
    }
    fs.writeFileSync(getCookieFilePath(), JSON.stringify(data), "utf8");
    console.log("[Proxy Cookie] Persisted cookies to disk");
  } catch (error) {
    console.error("[Proxy Cookie] Failed to persist cookies", error);
  }
}

/** Delete persisted cookie file from disk. */
function clearPersistedCookies(): void {
  try {
    const filePath = getCookieFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("[Proxy Cookie] Cleared persisted cookies from disk");
    }
  } catch (error) {
    console.error("[Proxy Cookie] Failed to clear persisted cookies", error);
  }
}

function getOrigin(url: string): string {
  try {
    const u = new URL(url);
    return u.origin; // e.g. "https://example.com"
  } catch {
    return url;
  }
}

/** Extract cookies from Set-Cookie response headers and store them. */
function captureResponseCookies(url: string, response: { headers?: Record<string, unknown> }): void {
  const raw = response.headers?.["set-cookie"];
  if (!raw) return;

  const origin = getOrigin(url);
  let jar = cookieJar.get(origin);
  if (!jar) {
    jar = new Map();
    cookieJar.set(origin, jar);
  }

  const items = Array.isArray(raw) ? raw : [raw];
  for (const setCookie of items) {
    if (typeof setCookie !== "string") continue;
    // Parse "name=value; attr; attr…"
    const nameValue = setCookie.split(";")[0];
    const eqIdx = nameValue.indexOf("=");
    if (eqIdx < 1) continue;
    const name = nameValue.substring(0, eqIdx).trim();
    const value = nameValue.substring(eqIdx + 1).trim();

    // Honour Max-Age=0 / Expires in the past → delete the cookie.
    const lower = setCookie.toLowerCase();
    const maxAgeMatch = lower.match(/max-age\s*=\s*(-?\d+)/);
    if (maxAgeMatch && parseInt(maxAgeMatch[1]) <= 0) {
      console.log(`[Proxy Cookie] Deleting cookie: ${name} (Max-Age=0)`);
      jar.delete(name);
      continue;
    }

    console.log(`[Proxy Cookie] Stored: ${name} (len=${value.length}) for ${origin}`);
    jar.set(name, value);
  }

  // Auto-persist to disk when "Remember Me" is active.
  if (cookiePersistenceEnabled) {
    persistCookiesToDisk();
  }
}

/** Build a Cookie header string for the given URL. */
function getCookieHeader(url: string): string {
  const jar = cookieJar.get(getOrigin(url));
  if (!jar || jar.size === 0) return "";
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

/** Merge stored cookies into the outgoing request headers. */
function applyRequestCookies(url: string, headers: Record<string, string>): Record<string, string> {
  // When the request already carries an explicit Authorization header, skip
  // cookie injection. This prevents stale session cookies from a previous user
  // from shadowing the explicit credentials (e.g. Basic auth for impersonation
  // or a Bearer token for a different user).
  if (headers["Authorization"] || headers["authorization"]) return headers;
  const cookie = getCookieHeader(url);
  if (!cookie) return headers;
  const names = cookie.split("; ").map((c) => c.split("=")[0]);
  console.log(`[Proxy Cookie] Attaching cookies to ${new URL(url).pathname}: ${names.join(", ")}`);
  return { ...headers, Cookie: cookie };
}

export function initializeProxy() {
  // Load any persisted cookies from a previous "Remember Me" session.
  loadPersistedCookies();

  ipcMain.handle("persist-cookies", () => {
    cookiePersistenceEnabled = true;
    persistCookiesToDisk();
    return true;
  });

  ipcMain.handle("clear-persisted-cookies", () => {
    cookiePersistenceEnabled = false;
    clearPersistedCookies();
    cookieJar.clear();
    return true;
  });

  ipcMain.handle("get-cloud-api-host", () => {
    const config = loadProxyConfig();
    const host = config.cloudApiHost || "";
    return host ? `${host.replace(/\/+$/, "")}/praiseprojector` : "";
  });

  ipcMain.handle("proxy-get", async (event, baseUrl: string, path: string, headers?: Record<string, string>) => {
    const validation = validateProxyTarget(baseUrl);
    if (!validation.ok) {
      return {
        error: {
          message: validation.error || "Proxy target validation failed",
          status: 400,
        },
      };
    }

    const url = `${baseUrl}${path}`;
    console.log(`[Proxy GET] Request: ${url}`);
    try {
      const response = await axios.get(url, {
        headers: applyRequestCookies(url, headers || {}),
      });
      captureResponseCookies(url, response);
      const dataSize = JSON.stringify(response.data).length;
      console.log(`[Proxy GET] Response: ${url} - Status: ${response.status}, Size: ${dataSize} bytes`);
      return response.data;
    } catch (error) {
      console.error(`[Proxy GET] Failed: ${url}`, error);
      if (axios.isAxiosError(error)) {
        if (error.response) captureResponseCookies(url, error.response);
        return {
          error: {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          },
        };
      }
      return {
        error: {
          message: "An unknown error occurred",
        },
      };
    }
  });

  ipcMain.handle("proxy-post", async (event, baseUrl: string, path: string, data: unknown, headers?: Record<string, string>) => {
    const validation = validateProxyTarget(baseUrl);
    if (!validation.ok) {
      return {
        error: {
          message: validation.error || "Proxy target validation failed",
          status: 400,
        },
      };
    }

    const url = `${baseUrl}${path}`;
    const requestSize = JSON.stringify(data).length;
    console.log(`[Proxy POST] Request: ${url} - Payload: ${requestSize} bytes`);
    try {
      const response = await axios.post(url, data, {
        headers: applyRequestCookies(url, {
          "Content-Type": "application/json",
          ...(headers || {}),
        }),
      });
      captureResponseCookies(url, response);
      const responseSize = JSON.stringify(response.data).length;
      console.log(`[Proxy POST] Response: ${url} - Status: ${response.status}, Size: ${responseSize} bytes`);
      return response.data;
    } catch (error) {
      console.error(`[Proxy POST] Failed: ${url}`, error);
      if (axios.isAxiosError(error)) {
        if (error.response) captureResponseCookies(url, error.response);
        return {
          error: {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          },
        };
      }
      return {
        error: {
          message: "An unknown error occurred",
        },
      };
    }
  });
}
