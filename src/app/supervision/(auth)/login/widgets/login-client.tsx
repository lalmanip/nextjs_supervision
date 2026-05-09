"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { loginSuperAdmin } from "@/features/auth/auth.api";
import { useAuthStore } from "@/features/auth/auth.store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/services/http/client";

const schema = z.object({
  userName: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);

  const next = search.get("next") || "/supervision/dashboard";
  const reason = search.get("reason");

  React.useEffect(() => {
    if (reason === "expired") {
      toast.warning("Session expired. Please sign in again.");
    }
  }, [reason]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userName: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const res = await loginSuperAdmin(values);
      setUser(res.user);
      toast.success("Welcome back.");
      router.replace(next);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  });

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            SuperAdmin Sign in
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to manage the Vivance platform.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Use your SuperAdmin credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="userName">Username</Label>
                <Input
                  id="userName"
                  autoComplete="username"
                  {...form.register("userName")}
                />
                {form.formState.errors.userName?.message ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.userName?.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register("password")}
                />
                {form.formState.errors.password?.message ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.password?.message}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
          By signing in, you agree to security policies and audit logging.
        </p>
      </div>
    </div>
  );
}

