import './globals.css';
import { ThemeProvider } from 'next-themes';
import { ReactQueryProvider } from './_providers/ReactQueryProvider';
import Navbar from '@/components/navigation/Navbar';
import { AuthProvider } from '@/components/user-auth-provider';

export const metadata = {
  title: 'JobCrawler',
  description: 'JobCrawler — Discover, filter, and track jobs with an AI-first experience.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="ji-theme">
          <AuthProvider>
            <ReactQueryProvider>
              <Navbar />
              {children}
            </ReactQueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}