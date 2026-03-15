// Central configuration values available at runtime.
// cloudApiHost — when set at build time (VITE_CLOUD_API_HOST), used as-is.
// When empty, falls back to the current page origin so the app works on any host.
function resolveCloudApiHost(): string {
  const fromEnv: string = import.meta.env.VITE_CLOUD_API_HOST || "";
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
export const cloudApiHost: string = resolveCloudApiHost();
export const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL;

const normalizeBaseUrl = (baseUrl: string, host: string): string => {
  if (!baseUrl) {
    return host.replace(/\/+$/, "");
  }
  if (/^https?:\/\//i.test(baseUrl)) {
    return baseUrl.replace(/\/+$/, "");
  }
  const cleanedHost = host.replace(/\/+$/, "");
  const cleanedPath = baseUrl.replace(/^\/+/, "");
  return `${cleanedHost}/${cleanedPath}`;
};

// When VITE_API_BASE_URL is a relative path (web builds), prepend the runtime origin
// so the webapp works on any host, not just the build-time hardcoded one.
function computeCloudApiBaseUrl(): string {
  if (!/^https?:\/\//i.test(apiBaseUrl) && typeof window !== "undefined") {
    return window.location.origin + "/" + apiBaseUrl.replace(/^\/+/, "");
  }
  return normalizeBaseUrl(apiBaseUrl, cloudApiHost);
}

export const cloudApiBaseUrl: string = computeCloudApiBaseUrl();
