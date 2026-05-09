import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/supervision/admin-shell";

const AUTH_COOKIE = "sv_token";

export default async function SupervisionAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    redirect("/supervision/login");
  }

  return <AdminShell>{children}</AdminShell>;
}

