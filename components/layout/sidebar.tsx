"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Brain, TrendingUp, Layers, Shield, Target,
  LayoutGrid, CalendarCheck, Settings, ChevronLeft, ChevronRight, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/command",    label: "Command",    icon: LayoutGrid,    accent: "#FAFAFA" },
  { href: "/physical",   label: "Physical",   icon: Activity,      accent: "#3B82F6" },
  { href: "/mental",     label: "Mental",     icon: Brain,         accent: "#A855F7" },
  { href: "/financial",  label: "Financial",  icon: TrendingUp,    accent: "#22C55E" },
  { href: "/skills",     label: "Skills",     icon: Layers,        accent: "#F59E0B" },
  { href: "/discipline", label: "Discipline", icon: Shield,        accent: "#EF4444" },
  { href: "/vision",     label: "Vision",     icon: Target,        accent: "#06B6D4" },
];

const BOTTOM_ITEMS = [
  { href: "/sitrep", label: "SITREP", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-apex-surface border-r border-apex-border",
        "transition-all duration-200 flex-shrink-0",
        collapsed ? "w-[52px]" : "w-[192px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-12 border-b border-apex-border flex-shrink-0",
        collapsed ? "justify-center px-0" : "px-4 gap-2"
      )}>
        <div className="w-5 h-5 bg-apex-blue rounded-sm flex items-center justify-center flex-shrink-0">
          <span className="text-white font-mono font-bold text-xs">A</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm text-apex-text-primary tracking-tight">
            APEX OS
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 h-9 mx-1.5 rounded-md transition-colors duration-100",
                collapsed ? "justify-center px-0 w-9" : "px-3",
                active
                  ? "bg-apex-surface-2 text-apex-text-primary"
                  : "text-apex-text-muted hover:text-apex-text-secondary hover:bg-apex-surface-2/50"
              )}
            >
              <Icon
                size={15}
                style={{ color: active ? item.accent : undefined }}
                className={cn("flex-shrink-0", !active && "text-current")}
              />
              {!collapsed && (
                <span className="text-xs font-medium">{item.label}</span>
              )}
              {!collapsed && active && (
                <div
                  className="ml-auto w-1 h-1 rounded-full"
                  style={{ backgroundColor: item.accent }}
                />
              )}
            </Link>
          );
        })}

        {!collapsed && (
          <div className="mx-3 my-2 border-t border-apex-border" />
        )}
        {collapsed && <div className="my-2" />}

        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 h-9 mx-1.5 rounded-md transition-colors duration-100",
                collapsed ? "justify-center px-0 w-9" : "px-3",
                active
                  ? "bg-apex-surface-2 text-apex-text-primary"
                  : "text-apex-text-muted hover:text-apex-text-secondary hover:bg-apex-surface-2/50"
              )}
            >
              <Icon size={15} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-xs font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={cn(
        "border-t border-apex-border py-2 flex flex-col gap-1",
        collapsed ? "items-center" : "px-1.5"
      )}>
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 h-9 rounded-md w-full transition-colors duration-100",
            "text-apex-text-muted hover:text-apex-red hover:bg-apex-red/5",
            collapsed ? "justify-center px-0 w-9" : "px-3"
          )}
        >
          <LogOut size={14} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Sign out</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-3 h-9 rounded-md w-full transition-colors duration-100",
            "text-apex-text-disabled hover:text-apex-text-muted hover:bg-apex-surface-2",
            collapsed ? "justify-center px-0 w-9" : "px-3"
          )}
        >
          {collapsed ? <ChevronRight size={13} /> : (
            <>
              <ChevronLeft size={13} />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
