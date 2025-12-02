import Navbar from '@/components/navigation/Navbar';
import { ReactNode } from 'react';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-6 md:px-8">
        {children}
      </main>
      <footer className="mt-auto border-t py-8 text-center text-xs opacity-70">
        © {new Date().getFullYear()} Job Intelligence
      </footer>
    </div>
  );
}