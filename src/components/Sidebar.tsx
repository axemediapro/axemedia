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
  Menu,
  X,
  PlusCircle,
} from "lucide-react";
import { useState, useEffect } from "react";

const adminStaffNavItems = [
  { href: "/",                label: "Dashboard",              icon: LayoutDashboard },
  { href: "/clients",         label: "Klientët",                icon: Users },
  { href: "/offers",          label: "Ofertat",                 icon: Tag },
  { href: "/invoices",        label: "Faturat",                 icon: FileText },
  { href: "/domain-invoices", label: "Domain/Hosting Invoices", icon: ReceiptText },
  { href: "/expenses",        label: "Shpenzimet",              icon: TrendingDown },
  { href: "/todos",           label: "TO DO",                   icon: ListTodo },
  { href: "/domains",         label: "Domain Reminder",         icon: BellRing },
  { href: "/calendar",        label: "Kalendar Postimesh",     icon: Calendar },
  { href: "/services",        label: "Shërbimet",               icon: Wrench },
];

const clientNavItems = [
  { href: "/invoices", label: "Faturat e Mia", icon: FileText },
  { href: "/offers",   label: "Ofertat e Mia", icon: Tag },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileOpen]);

  // Hide sidebar on login page or when unauthenticated
  if (pathname === "/login" || !session) return null;

  const role = session?.user?.role ?? "staff";
  const navItems = role === "client" ? clientNavItems : adminStaffNavItems;

  return (
    <>
      {/* ========================================================= */}
      {/* 1. MOBILE TOP APP BAR (< md)                              */}
      {/* ========================================================= */}
      <header className="print:hidden md:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none cursor-pointer"
            aria-label="Hap menunë"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              AXE<span className="text-indigo-400">media</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/invoices/new"
            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
            title="Faturë e Re"
          >
            <PlusCircle className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
            {session.user.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MOBILE SLIDE-OVER DRAWER (< md)                        */}
      {/* ========================================================= */}
      {mobileOpen && (
        <div className="print:hidden md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-slate-900 text-slate-100 flex flex-col z-10 shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight text-white">
                    AXE<span className="text-indigo-400">media</span>
                  </span>
                  <p className="text-[11px] text-slate-400 leading-none">Menaxhim Biznesi</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}

              {/* Admin-only: Users */}
              {role === "admin" && (
                <Link
                  href="/users"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    pathname.startsWith("/users")
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <UserCog className="w-5 h-5 flex-shrink-0" />
                  <span>Përdoruesit</span>
                </Link>
              )}

              {/* Settings */}
              {role !== "client" && (
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    pathname.startsWith("/settings")
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span>Cilësimet</span>
                </Link>
              )}
            </nav>

            {/* Drawer User Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 font-bold text-sm text-white">
                  {role === "admin" ? <ShieldCheck className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{session.user.name}</p>
                  {session.user.username && (
                    <p className="text-[11px] text-slate-400 font-mono truncate">@{session.user.username}</p>
                  )}
                  <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${roleBadgeColors[role] ?? "bg-slate-700 text-slate-300"}`}>
                    {roleLabels[role] ?? role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Dil"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR (< md)                    */}
      {/* ========================================================= */}
      <div className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 px-3 py-2 flex items-center justify-around shadow-2xl">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            pathname === "/" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Kryefaqja</span>
        </Link>

        <Link
          href="/invoices"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            pathname.startsWith("/invoices") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Faturat</span>
        </Link>

        {role !== "client" && (
          <Link
            href="/clients"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
              pathname.startsWith("/clients") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Klientët</span>
          </Link>
        )}

        <Link
          href="/offers"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            pathname.startsWith("/offers") ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Tag className="w-5 h-5" />
          <span className="text-[10px]">Ofertat</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 4. DESKTOP SIDEBAR (>= md)                                */}
      {/* ========================================================= */}
      <aside
        className={`print:hidden hidden md:flex flex-col bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out ${
          collapsed ? "w-16" : "w-64"
        } min-h-screen relative flex-shrink-0`}
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
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
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
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 font-bold text-xs text-white">
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
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-700 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Dil"
                className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-700 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all z-10 cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>
    </>
  );
}
