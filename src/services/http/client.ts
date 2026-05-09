import axios, { AxiosError } from "axios";

export const http = axios.create({
  baseURL: "",
  withCredentials: true,
  timeout: 20_000,
  headers: {
    "Content-Type": "application/json",
  },
});

export type ApiErrorPayload = {
  message?: string;
  error?: string;
};

export function getApiErrorMessage(err: unknown): string {
  const ax = err as AxiosError<ApiErrorPayload>;
  return (
    ax?.response?.data?.message ||
    ax?.response?.data?.error ||
    ax?.message ||
    "Something went wrong"
  );
}

