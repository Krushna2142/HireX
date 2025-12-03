"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/user-auth-provider";
import { ModeToggle } from "@/components/ModeToggle";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, signIn, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/jobs", label: "Jobs" },
    { href: "/recommendations", label: "Recommendations" },
    { href: "/resume", label: "Resume" },
    { href: "/mock-interview", label: "Mock Interview" },
    { href: "/mock-interview/chat", label: "Interview Chat" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
        
        <Link href="/" className="font-bold text-lg tracking-tight">
          JobCrawler
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${
                pathname === item.href
                  ? "text-primary underline"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* SHOW DASHBOARD ONLY IF LOGGED IN */}
          {user && (
            <Link
              href="/dashboard"
              className={`${
                pathname === "/dashboard"
                  ? "text-primary underline"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ModeToggle />

          {!user ? (
            <button
              onClick={signIn}
              className="px-4 py-2 bg-primary text-white rounded-md"
            >
              Sign In
            </button>
          ) : (
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-md"
            >
              Logout
            </button>
          )}

          <button
            className="md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
