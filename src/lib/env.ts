import { z } from "zod";

const serverEnvSchema = z.object({
  USER_REPO_URL: z
    .string()
    .min(
      1,
      "USER_REPO_URL is required. Copy .env.example to .env.local and set USER_REPO_URL to your user API base URL."
    )
    .url("USER_REPO_URL must be a valid URL (e.g. http://127.0.0.1)"),
  /** Base URL for vivapi-auth (e.g. http://localhost:8084) */
  AUTH_URL: z
    .string()
    .min(1, "AUTH_URL is required. Set it in .env.local (vivapi-auth base URL).")
    .url("AUTH_URL must be a valid URL"),
  /** Sent as X-API-KEY on calls to USER_REPO_URL APIs */
  VIV_X_API_KEY: z
    .string()
    .min(1, "VIV_X_API_KEY is required. Set it in .env.local."),
  AUTH_APP_DOMAIN_KEY: z.string().min(1),
  AUTH_APP_USERNAME: z.string().min(1),
  AUTH_APP_PASSWORD: z.string().min(1),
  AUTH_APP_SYSTEM: z.string().min(1),
  /** Base URL for vivapi-mt (defaults to USER_REPO_URL when unset) */
  MT_REPO_URL: z
    .string()
    .min(1)
    .url("MT_REPO_URL must be a valid URL"),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

function isNonProduction(): boolean {
  return process.env.NODE_ENV !== "production";
}

function resolveUserRepoUrl(): string {
  const trimmed = process.env.USER_REPO_URL?.trim();
  if (trimmed) return trimmed;
  if (isNonProduction()) {
    return "http://127.0.0.1";
  }
  return "";
}

function resolveAuthUrl(): string {
  const trimmed = process.env.AUTH_URL?.trim();
  if (trimmed) return trimmed;
  if (isNonProduction()) {
    return "http://localhost:8084";
  }
  return "";
}

/** Production must set a real key; dev may omit and use a placeholder. */
function resolveXApiKey(): string {
  const trimmed = process.env.VIV_X_API_KEY?.trim();
  if (trimmed) return trimmed;
  if (isNonProduction()) {
    return "dev";
  }
  return "";
}

function resolveAuthLoginDomainKey(): string {
  const t = process.env.AUTH_APP_DOMAIN_KEY?.trim();
  if (t) return t;
  if (isNonProduction()) return "TMX5193291565602439";
  return "";
}

function resolveAuthLoginUsername(): string {
  const t = process.env.AUTH_APP_USERNAME?.trim();
  if (t) return t;
  if (isNonProduction()) return "test229267";
  return "";
}

function resolveAuthLoginPassword(): string {
  const t = process.env.AUTH_APP_PASSWORD?.trim();
  if (t) return t;
  if (isNonProduction()) return "test@229";
  return "";
}

function resolveAuthLoginSystem(): string {
  const t = process.env.AUTH_APP_SYSTEM?.trim();
  if (t) return t;
  if (isNonProduction()) return "test";
  return "";
}

function resolveMtRepoUrl(): string {
  const trimmed = process.env.MT_REPO_URL?.trim();
  if (trimmed) return trimmed;
  // Local dev: vivapi-mt base (e.g. POST /vivapi-mt/rest/get-agency-balance)
  if (isNonProduction()) {
    return "http://localhost:8080";
  }
  return "";
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const userRepo = resolveUserRepoUrl();
  cached = serverEnvSchema.parse({
    USER_REPO_URL: userRepo,
    AUTH_URL: resolveAuthUrl(),
    VIV_X_API_KEY: resolveXApiKey(),
    AUTH_APP_DOMAIN_KEY: resolveAuthLoginDomainKey(),
    AUTH_APP_USERNAME: resolveAuthLoginUsername(),
    AUTH_APP_PASSWORD: resolveAuthLoginPassword(),
    AUTH_APP_SYSTEM: resolveAuthLoginSystem(),
    MT_REPO_URL: resolveMtRepoUrl(),
    NODE_ENV: process.env.NODE_ENV,
  });
  return cached;
}

