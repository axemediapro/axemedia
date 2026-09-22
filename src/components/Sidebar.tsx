"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  FileText,
  ReceiptText,
  TrendingDown,
  Calendar,
  BellRing,
  ListTodo,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Tag,
  Wrench,
  UserCog,
  LogOut,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { useState } from "react";

const adminStaffNavItems = [
  { href: "/",         label: "Dashboard",          icon: LayoutDashboard },
  { href: "/clients",  label: "Klientët",            icon: Users },
  { href: "/offers",   label: "Ofertat",             icon: Tag },
  { href: "/invoices", label: "Faturat",             icon: FileText },
  { href: "/domain-invoices", label: "Domain/Hosting Invoices", icon: ReceiptText },
  { href: "/expenses", label: "Shpenzimet",          icon: TrendingDown },
  { href: "/todos",    label: "TO DO",               icon: ListTodo },
  { href: "/domains",  label: "Domain Reminder",     icon: BellRing },
  { href: "/calendar", label: "Kalendar Postimesh", icon: Calendar },
  { href: "/services", label: "Shërbimet",           icon: Wrench },
];

const clientNavItems = [
  { href: "/invoices", label: "Faturat e Mia",  icon: FileText },
  { href: "/offers",   label: "Ofertat e Mia",  icon: Tag },
];

const roleLabels: Record<string, string> = {
  admin:  "Administrator",
  staff:  "Staf",
  client: "Klient",
};

const roleBadgeColors: Record<string, string> = {
  admin:  "bg-indigo-500/20 text-indigo-300",
  staff:  "bg-emerald-500/20 text-emerald-300",
  client: "bg-amber-500/20 text-amber-300",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  // Hide sidebar on login page or when not logged in
  if (pathname === "/login" || !session) return null;

  const role     = session?.user?.role ?? "staff";
  const navItems = role === "client" ? clientNavItems : adminStaffNavItems;

  return (
    <aside
      className={`print:hidden flex flex-col bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      } min-h-screen relative`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-lg tracking-tight text-white">
              AXE<span className="text-indigo-400">media</span>
            </span>
            <p className="text-xs text-slate-400 leading-none">Menaxhim Biznesi</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-200" />
              )}
            </Link>
          );
        })}

        {/* Admin-only: User Management */}
        {role === "admin" && (
          <Link
            href="/users"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              pathname.startsWith("/users")
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            title={collapsed ? "Përdoruesit" : undefined}
          >
            <UserCog className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Përdoruesit</span>}
            {pathname.startsWith("/users") && !collapsed && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-200" />
            )}
          </Link>
        )}
      </nav>

      {/* Settings (admin/staff only) */}
      {role !== "client" && (
        <div className="px-2 pt-1 border-t border-slate-700">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              pathname.startsWith("/settings")
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            title={collapsed ? "Cilësimet" : undefined}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Cilësimet</span>}
          </Link>
        </div>
      )}

      {/* User info + logout */}
      {session?.user && (
        <div className={`px-2 py-3 border-t border-slate-700 ${collapsed ? "flex flex-col items-center gap-2" : ""}`}>
          {!collapsed ? (
            <div className="px-3 py-2.5 rounded-lg bg-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  {role === "admin" ? (
                    <ShieldCheck className="w-4 h-4 text-white" />
                  ) : (
                    <UserCircle className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {session.user.name}
                  </p>
                  {session.user.username && (
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      @{session.user.username}
                    </p>
                  )}
                  <span
                    className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${
                      roleBadgeColors[role] ?? "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {roleLabels[role] ?? role}
                  </span>
                </div>

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Dil"
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-700 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Dil"
              className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-700 hover:text-red-400 flex items-center justify-center transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
}
