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

export function initializeProxy() {
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
        headers: headers || {},
      });
      const dataSize = JSON.stringify(response.data).length;
      console.log(`[Proxy GET] Response: ${url} - Status: ${response.status}, Size: ${dataSize} bytes`);
      return response.data;
    } catch (error) {
      console.error(`[Proxy GET] Failed: ${url}`, error);
      if (axios.isAxiosError(error)) {
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
        headers: {
          "Content-Type": "application/json",
          ...(headers || {}),
        },
      });
      const responseSize = JSON.stringify(response.data).length;
      console.log(`[Proxy POST] Response: ${url} - Status: ${response.status}, Size: ${responseSize} bytes`);
      return response.data;
    } catch (error) {
      console.error(`[Proxy POST] Failed: ${url}`, error);
      if (axios.isAxiosError(error)) {
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
