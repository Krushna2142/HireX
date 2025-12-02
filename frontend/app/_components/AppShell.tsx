/* eslint-disable @typescript-eslint/no-unused-vars */
import Navbar from '../../components/navigation/Navbar';
import { ReactNode } from 'react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      <footer className="text-center text-xs py-8 opacity-70">
        © {new Date().getFullYear()} Job Intelligence
      </footer>
    </div>
  );
}