"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, UserRoundCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { supervisionMenu, type MenuItem } from "@/features/navigation/menu";
import { useRbacStore } from "@/features/rbac/rbac.store";
import { logoutSuperAdmin } from "@/features/auth/auth.api";
import { useAuthStore } from "@/features/auth/auth.store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function MenuNode({
  item,
  collapsed,
  level = 0,
}: {
  item: MenuItem;
  collapsed: boolean;
  level?: number;
}) {
  const pathname = usePathname();
  const hasPermission = useRbacStore((s) => s.has);

  if (item.required && !hasPermission(item.required)) return null;

  const isActive =
    item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false;

  const [open, setOpen] = React.useState<boolean>(() => {
    if (!item.children?.length) return false;
    return item.children.some((c) => (c.href ? pathname.startsWith(c.href) : false));
  });

  const leftPad = collapsed ? "px-2" : level === 0 ? "px-3" : "pl-10 pr-3";

  if (item.children?.length) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-2 rounded-md py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900",
            leftPad
          )}
          aria-expanded={open}
        >
          {item.icon ? <item.icon className="h-4 w-4" /> : null}
          {!collapsed ? <span className="flex-1 text-left">{item.label}</span> : null}
          {!collapsed ? (
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          ) : null}
        </button>
        {open && !collapsed ? (
          <div className="space-y-1">
            {item.children.map((c) => (
              <MenuNode key={c.key} item={c} collapsed={collapsed} level={level + 1} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!item.href) return null;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-md py-2 text-sm transition-colors",
        "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900",
        isActive && "bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50",
        leftPad
      )}
    >
      {item.icon ? <item.icon className="h-4 w-4" /> : null}
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  React.useEffect(() => {
    // Reset nested open states when collapsing/expanding
  }, [collapsed, pathname]);

  const initials =
    (user?.firstName?.[0] || user?.userName?.[0] || "S").toUpperCase() +
    (user?.lastName?.[0] || "").toUpperCase();

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="flex min-h-dvh">
        <aside
          className={cn(
            "border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
            "transition-[width] duration-200",
            collapsed ? "w-16" : "w-72"
          )}
        >
          <div className={cn("h-14 flex items-center", collapsed ? "px-2" : "px-3")}>
            <div className="flex items-center gap-2 flex-1">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center text-sm font-semibold">
                SV
              </div>
              {!collapsed ? (
                <div className="leading-tight">
                  <div className="text-sm font-semibold">Supervision</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    SuperAdmin Portal
                  </div>
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          </div>
          <Separator />
          <nav className={cn("p-2 space-y-1", collapsed && "items-center")}>
            {supervisionMenu.map((item) => (
              <MenuNode key={item.key} item={item} collapsed={collapsed} />
            ))}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 flex items-center px-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                {pathname}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium leading-none">
                      {user?.userName || "SuperAdmin"}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">SuperAdmin</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    toast.message("Change password page is planned.");
                  }}
                >
                  <UserRoundCog className="h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={async (e) => {
                    e.preventDefault();
                    try {
                      await logoutSuperAdmin();
                    } finally {
                      clear();
                      window.location.href = "/supervision/login";
                    }
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 min-w-0 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

