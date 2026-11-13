import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

import appCss from "../styles.css?url";
import { AppProvider, themeInitScript, useApp } from "../lib/app-state";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to={Capacitor.isNativePlatform() ? "/login" : "/"}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {Capacitor.isNativePlatform() ? "Go to login" : "Go home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "StudyGenie — Your magical study companion" },
      { name: "description", content: "Gamified study plans, flashcards, quizzes and streaks for university students." },
      { property: "og:title", content: "StudyGenie — Your magical study companion" },
      { property: "og:description", content: "Gamified study plans, flashcards, quizzes and streaks for university students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap" },
    ],
    scripts: [{ children: themeInitScript }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RoutePreloader() {
  const router = useRouter();
  const { isAuthenticated, user } = useApp();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const schedule =
      "requestIdleCallback" in window
        ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 2000 })
        : (cb: () => void) => setTimeout(cb, 250);

    const cancel = (id: any) => {
      if ("cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };

    const handle = schedule(() => {
      const routesToPreload = isAuthenticated
        ? [
            "/dashboard",
            "/courses",
            "/plan",
            "/flashcards",
            "/quiz",
            "/pomodoro",
            "/leaderboard",
            "/profile",
            "/settings",
            ...(user?.role === "ADMIN" || user?.role === "MODERATOR"
              ? [
                  "/admin/overview",
                  "/admin/reports",
                  "/admin/courses",
                  "/admin/users",
                  "/admin/audit-log",
                ]
              : []),
          ]
        : ["/login", "/signup", "/onboarding", "/forgot-password"];

      // Preload route chunks silently during idle time
      routesToPreload.forEach((to, idx) => {
        setTimeout(() => {
          try {
            router.preloadRoute({ to: to as any }).catch(() => {});
          } catch {}
        }, idx * 60);
      });
    });

    return () => cancel(handle);
  }, [router, isAuthenticated, user?.role]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <RoutePreloader />
        <Outlet />
        <Toaster position="top-center" />
      </AppProvider>
    </QueryClientProvider>
  );
}
