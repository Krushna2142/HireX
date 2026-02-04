/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
// components/dashboard/Topbar.tsx
"use client";
import React from "react";
import { Bell, ChevronDown, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import ThemeToggle  from "@/components/ThemeToggle";
import { useAuth } from "@/components/providers/AuthProvider"; // if you have

export default function Topbar() {
  const { user } = (typeof window !== "undefined" ? (require('@/components/AuthProvider').useAuth?.() ?? {}) : {}) as any;
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/60 backdrop-blur px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-xl font-semibold tracking-tight neon-underline">JobCrawler</div>
        <div className="hidden md:block text-sm text-muted-foreground">AI Job Assistant • Dashboard</div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
          </Button>
        </div>

        <ThemeToggle />

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-muted transition">
            <UserCircle className="h-6 w-6" />
            <span className="hidden sm:inline text-sm">{user?.displayName ?? "Guest"}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
