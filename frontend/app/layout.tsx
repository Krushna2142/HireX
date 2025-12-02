import './globals.css';
import AppShell from './_components/AppShell';
import { ReactQueryProvider } from './_providers/ReactQueryProvider';
import { ThemeProvider } from './_providers/ThemeProvider';
import { PreloadThemeScript } from './_providers/PreloadThemeScript';

export const metadata = {
  title: 'Job Intelligence Platform',
  description: 'Advanced job recommendations & career tools.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <PreloadThemeScript />
      </head>
      <body className="bg-bg text-text">
        <ThemeProvider>
          <ReactQueryProvider>
            <AppShell>{children}</AppShell>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}