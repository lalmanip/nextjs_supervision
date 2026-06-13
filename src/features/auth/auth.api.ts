import { http } from "@/services/http";
import type {
  LoginInput,
  LoginResponse,
  MeResponse,
} from "@/features/auth/auth.types";

export async function loginSuperAdmin(input: LoginInput): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>("/api/supervision/auth/login", {
    ...input,
    userType: 1,
  });
  return data;
}

export async function fetchAuthMe(): Promise<MeResponse> {
  const { data } = await http.get<MeResponse>("/api/supervision/auth/me");
  return data;
}

export async function logoutSuperAdmin(): Promise<void> {
  await http.post("/api/supervision/auth/logout");
}

