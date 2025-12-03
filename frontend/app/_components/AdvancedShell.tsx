// app/_components/AdvancedShell.tsx
"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import AnimatedSidebar from "@/components/dashboard/AnimatedSidebar";

export default function AdvancedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <AnimatedSidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
