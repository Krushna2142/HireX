// components/dashboard/AnimatedSidebar.tsx
"use client";
import React from "react";
import Link from "next/link";
import { Home, FileText, Search, Users, Archive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Home", icon: <Home /> },
  { href: "/dashboard/resume", label: "Resume", icon: <FileText /> },
  { href: "/jobs", label: "Jobs", icon: <Search /> },
  { href: "/dashboard/network", label: "Networking", icon: <Users /> },
  { href: "/dashboard/tracker", label: "Tracker", icon: <Archive /> },
];

export default function AnimatedSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(true);

  return (
    <aside className="hidden md:flex md:flex-col">
      <div className="flex h-full w-72 flex-col gap-4 border-r border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">JobCrawler</div>
          <button
            aria-label="Toggle sidebar"
            onClick={() => setOpen((s) => !s)}
            className="rounded-md p-1 hover:bg-muted"
          >
            {open ? "◀" : "▶"}
          </button>
        </div>

        <nav className="mt-4 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href}>
                <motion.a
                  whileHover={{ x: 6 }}
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 1 }}
                  className={[
                    "group flex items-center gap-3 rounded-md px-3 py-2 transition",
                    active ? "bg-primary/12 text-primary" : "hover:bg-muted text-card-foreground",
                  ].join(" ")}
                >
                  <span className="rounded-md p-1 text-muted-foreground group-hover:text-primary">{n.icon}</span>
                  <span className={open ? "block" : "hidden"}>{n.label}</span>
                </motion.a>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto text-sm text-muted-foreground">
          <div className="mb-2">Account</div>
          <div className="rounded-md border p-3 glass">
            <div className="text-xs">Free plan • 10k roles indexed</div>
            <div className="mt-2 flex gap-2">
              <button className="rounded-md bg-primary/10 px-3 py-1 text-xs text-primary">Upgrade</button>
              <button className="rounded-md border px-3 py-1 text-xs">Settings</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
