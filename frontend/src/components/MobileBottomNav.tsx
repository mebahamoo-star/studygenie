import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, BookOpen, Brain, Trophy, User, Sparkles, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  ar: string;
  icon: React.ComponentType<{ className?: string }>;
  match: readonly string[];
}

const ITEMS: readonly NavItem[] = [
  { to: "/dashboard", label: "Home", ar: "الرئيسية", icon: Home, match: ["/dashboard"] },
  { to: "/courses", label: "Courses", ar: "موادي", icon: BookOpen, match: ["/courses"] },
  { to: "/plan", label: "Study", ar: "الدراسة", icon: Brain, match: ["/plan", "/pomodoro", "/flashcards", "/quiz"] },
  { to: "/leaderboard", label: "Ranks", ar: "الترتيب", icon: Trophy, match: ["/leaderboard"] },
  { to: "/profile", label: "Profile", ar: "الملف", icon: User, match: ["/profile"] },
];

export function MobileBottomNav({
  accessory = true,
}: {
  accessory?: boolean;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { lang, user } = useApp();
  const isAdminOrMod = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const items: readonly NavItem[] = isAdminOrMod
    ? [
        ...ITEMS,
        {
          to: user?.role === "MODERATOR" ? "/admin/reports" : "/admin/overview",
          label: "Admin",
          ar: "الإدارة",
          icon: ShieldCheck,
          match: ["/admin"],
        },
      ]
    : ITEMS;

  return (
    <div className="fixed inset-x-0 bottom-3 z-50 flex justify-center pointer-events-none px-3 md:hidden">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-2 py-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
        <ul className="flex items-center gap-1">
          {items.map((item) => {
            const isActive = item.match.some((m) => path.startsWith(m));
            const Icon = item.icon;
            const labelText = lang === "ar" ? item.ar : item.label;

            return (
              <li key={item.to} className="relative">
                <Link
                  to={item.to}
                  className={cn(
                    "relative z-10 flex flex-col items-center justify-center rounded-full px-3 py-1.5 transition-colors duration-200 outline-none",
                    isActive
                      ? "text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Sliding gliding highlight pill */}
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-highlight"
                      className="absolute inset-0 z-0 rounded-full bg-gradient-magic shadow-glow"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 32,
                      }}
                    />
                  )}

                  <span className="relative z-10 flex flex-col items-center gap-0.5">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-[10px] leading-tight font-medium tracking-tight">
                      {labelText}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {accessory && (
          <>
            <div className="h-6 w-px bg-border/60 mx-0.5" />
            <Link
              to="/pomodoro"
              aria-label="Quick Pomodoro Sprint"
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full bg-accent/80 text-foreground transition-all duration-300 hover:scale-105 hover:bg-accent active:scale-95 shadow-sm border border-border/50",
                path.startsWith("/pomodoro") && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Sparkles className="h-5 w-5 text-gold animate-pulse-soft" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
