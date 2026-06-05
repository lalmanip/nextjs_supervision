import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { fetchVivapiAppBearer } from "@/services/vivapi/app-auth";

const AUTH_COOKIE = "sv_token";

export async function requireSupervisionSession() {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return { ok: false as const, response: Response.json({ message: "Unauthenticated" }, { status: 401 }) };
  }
  return { ok: true as const };
}

export async function vivapiUserHeaders() {
  const env = getServerEnv();
  const bearer = await fetchVivapiAppBearer(env);
  return {
    env,
    base: env.USER_REPO_URL.replace(/\/$/, ""),
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": env.VIV_X_API_KEY,
      Authorization: `Bearer ${bearer}`,
    },
  };
}
