"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cloud, Settings, Activity, LogOut, Podcast } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/podcasts", label: "Podcasts", icon: Podcast },
  { href: "/jobs", label: "Jobs", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="top-0 z-40 sticky bg-background/80 backdrop-blur-xl border-b">
      <div className="flex justify-between items-center mx-auto px-4 max-w-5xl h-14">
        <div className="flex items-center gap-6">
          <Link
            href="/podcasts"
            className="flex items-center gap-2 hover:opacity-80 font-semibold text-foreground transition-opacity"
          >
            <Cloud className="w-5 h-5" />
            <span className="hidden sm:inline">PodCastDN</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2 text-muted-foreground",
                    pathname.startsWith(item.href) &&
                      "text-foreground bg-accent"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground">
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
