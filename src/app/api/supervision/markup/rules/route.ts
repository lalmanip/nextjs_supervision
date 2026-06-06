import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { getServerEnv } from "@/lib/env";
import {
  buildVivapiAuthorizedHeaders,
  fetchVivapiAppBearer,
} from "@/services/vivapi/app-auth";

const AUTH_COOKIE = "sv_token";

async function upstreamHeaders() {
  const env = getServerEnv();
  const bearer = await fetchVivapiAppBearer(env);
  return buildVivapiAuthorizedHeaders(env, bearer);
}

function userRepoBase() {
  const env = getServerEnv();
  return env.USER_REPO_URL.replace(/\/$/, "");
}

export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }
  try {
    const url = `${userRepoBase()}/vivapi-user/markup/rules`;
    const res = await axios.get(url, { headers: await upstreamHeaders() });
    return NextResponse.json(res.data, { status: res.status });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return NextResponse.json(err.response.data, { status: err.response.status });
    }
    return NextResponse.json({ message: "Failed to load markup rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const url = `${userRepoBase()}/vivapi-user/markup/rules`;
    const res = await axios.post(url, body, { headers: await upstreamHeaders() });
    return NextResponse.json(res.data, { status: res.status });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return NextResponse.json(err.response.data, { status: err.response.status });
    }
    return NextResponse.json({ message: "Failed to create markup rule" }, { status: 500 });
  }
}
