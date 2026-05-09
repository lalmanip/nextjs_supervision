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
  X_API_KEY: z
    .string()
    .min(1, "X_API_KEY is required. Set it in .env.local."),
  AUTH_LOGIN_DOMAIN_KEY: z.string().min(1),
  AUTH_LOGIN_USERNAME: z.string().min(1),
  AUTH_LOGIN_PASSWORD: z.string().min(1),
  AUTH_LOGIN_SYSTEM: z.string().min(1),
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
  const trimmed = process.env.X_API_KEY?.trim();
  if (trimmed) return trimmed;
  if (isNonProduction()) {
    return "dev";
  }
  return "";
}

function resolveAuthLoginDomainKey(): string {
  const t = process.env.AUTH_LOGIN_DOMAIN_KEY?.trim();
  if (t) return t;
  if (isNonProduction()) return "TMX5193291565602439";
  return "";
}

function resolveAuthLoginUsername(): string {
  const t = process.env.AUTH_LOGIN_USERNAME?.trim();
  if (t) return t;
  if (isNonProduction()) return "test229267";
  return "";
}

function resolveAuthLoginPassword(): string {
  const t = process.env.AUTH_LOGIN_PASSWORD?.trim();
  if (t) return t;
  if (isNonProduction()) return "test@229";
  return "";
}

function resolveAuthLoginSystem(): string {
  const t = process.env.AUTH_LOGIN_SYSTEM?.trim();
  if (t) return t;
  if (isNonProduction()) return "test";
  return "";
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  cached = serverEnvSchema.parse({
    USER_REPO_URL: resolveUserRepoUrl(),
    AUTH_URL: resolveAuthUrl(),
    X_API_KEY: resolveXApiKey(),
    AUTH_LOGIN_DOMAIN_KEY: resolveAuthLoginDomainKey(),
    AUTH_LOGIN_USERNAME: resolveAuthLoginUsername(),
    AUTH_LOGIN_PASSWORD: resolveAuthLoginPassword(),
    AUTH_LOGIN_SYSTEM: resolveAuthLoginSystem(),
    NODE_ENV: process.env.NODE_ENV,
  });
  return cached;
}

