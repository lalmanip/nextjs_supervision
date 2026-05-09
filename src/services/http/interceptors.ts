import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import {
  isClientApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

function headersToRecord(h: unknown): Record<string, unknown> {
  if (!h || typeof h !== "object") return {};
  if (typeof (h as { toJSON?: () => Record<string, unknown> }).toJSON === "function") {
    return (h as { toJSON: () => Record<string, unknown> }).toJSON();
  }
  return { ...(h as Record<string, unknown>) };
}

function resolveEndpoint(config: InternalAxiosRequestConfig): string {
  try {
    return axios.getUri(config);
  } catch {
    const base = config.baseURL ?? "";
    const path = config.url ?? "";
    const q = config.params
      ? `?${new URLSearchParams(
          Object.entries(config.params).map(([k, v]) => [k, String(v)])
        ).toString()}`
      : "";
    return `${base}${path}${q}`;
  }
}

export function attachGlobalInterceptors(http: AxiosInstance) {
  http.interceptors.request.use((config) => {
    if (isClientApiDebugEnabled()) {
      logApiDebug("axios:request", {
        endpoint: resolveEndpoint(config),
        method: (config.method || "get").toUpperCase(),
        params: sanitizeForLog(config.params),
        requestHeaders: sanitizeHeaders(headersToRecord(config.headers)),
        requestBody: sanitizeForLog(config.data),
      });
    }
    return config;
  });

  http.interceptors.response.use(
    (res) => {
      if (isClientApiDebugEnabled()) {
        logApiDebug("axios:response:ok", {
          endpoint: resolveEndpoint(res.config),
          method: (res.config.method || "get").toUpperCase(),
          status: res.status,
          statusText: res.statusText,
          responseHeaders: sanitizeHeaders(headersToRecord(res.headers)),
          responseData: sanitizeForLog(res.data),
        });
      }
      return res;
    },
    async (error) => {
      if (isClientApiDebugEnabled()) {
        const ax = error as AxiosError;
        const cfg = ax.config;
        if (cfg) {
          logApiDebug("axios:response:error", {
            endpoint: resolveEndpoint(cfg),
            method: (cfg.method || "get").toUpperCase(),
            params: sanitizeForLog(cfg.params),
            requestHeaders: sanitizeHeaders(headersToRecord(cfg.headers)),
            requestBody: sanitizeForLog(cfg.data),
            status: ax.response?.status,
            statusText: ax.response?.statusText,
            responseHeaders: ax.response?.headers
              ? sanitizeHeaders(headersToRecord(ax.response.headers))
              : {},
            responseData: sanitizeForLog(ax.response?.data),
            errorMessage: ax.message,
          });
        } else {
          logApiDebug("axios:response:error", {
            errorMessage: ax.message,
            responseData: sanitizeForLog(ax.response?.data),
          });
        }
      }
      const config = error?.config as
        | (Record<string, any> & { __retryCount?: number })
        | undefined;

      // Basic retry (network errors / 5xx), max 2 attempts.
      const status = error?.response?.status as number | undefined;
      const isRetryable =
        !status || (status >= 500 && status <= 599);

      if (config && isRetryable) {
        config.__retryCount = (config.__retryCount || 0) + 1;
        if (config.__retryCount <= 2) {
          const backoffMs = 300 * Math.pow(2, config.__retryCount - 1);
          await new Promise((r) => setTimeout(r, backoffMs));
          return http.request(config as any);
        }
      }

      const url = typeof window !== "undefined" ? window.location.pathname : "";

      if (status === 401 && typeof window !== "undefined") {
        // Avoid spamming toast if user is already on login
        if (!url.startsWith("/supervision/login")) {
          toast.error("Your session has expired. Please sign in again.");
          window.location.href = "/supervision/login?reason=expired";
        }
      }

      return Promise.reject(error);
    }
  );
}

