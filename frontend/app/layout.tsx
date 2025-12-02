import './globals.css';
import { ThemeProvider } from './_providers/ThemeProvider';
import { ReactQueryProvider } from './_providers/ReactQueryProvider';
import AppShell from './_components/AppShell';
import PreloadThemeScript from './_providers/PreloadThemeScript';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <PreloadThemeScript />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ReactQueryProvider>
            <AppShell>{children}</AppShell>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}