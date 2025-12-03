"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/user-auth-provider";
import { ModeToggle } from "@/components/ModeToggle";
import MegaMenu from "./MegaMenu";
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
    { href: "/dashboard", label: "Dashboard" }, // Now visible to all
  ];

  const handleDashboardClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      // Show toast or console message for Phase 1
      alert("Please sign in to access the Dashboard");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
        
        <Link href="/" className="font-bold text-lg tracking-tight">
          JobCrawler
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <MegaMenu />
          
          {links.map((item) => {
            const isActive = pathname === item.href;
            const isDashboard = item.href === "/dashboard";
            
            if (isDashboard) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleDashboardClick}
                  className={`${
                    isActive
                      ? "text-primary underline"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${
                  isActive
                    ? "text-primary underline"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ModeToggle />

          {!user ? (
            <button
              onClick={signIn}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm hover:bg-primary/90 transition"
            >
              Sign in with Google
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {user.photo && (
                <img
                  src={user.photo}
                  alt={user.name || "User"}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition"
              >
                Sign out
              </button>
            </div>
          )}

          <button
            className="md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
          <nav className="flex flex-col gap-2 p-4">
            {links.map((item) => {
              const isDashboard = item.href === "/dashboard";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (isDashboard) handleDashboardClick(e);
                    setOpen(false);
                  }}
                  className={`${
                    pathname === item.href
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  } px-2 py-2 rounded-md hover:bg-muted transition`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
