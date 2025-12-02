import './globals.css';
import AppShell from './_components/AppShell';
import { ReactQueryProvider } from './_providers/ReactQueryProvider';

export const metadata = {
  title: 'Job Intelligence Platform',
  description: 'Advanced job recommendations & career tools.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg text-text">
        <ReactQueryProvider>
          <AppShell>{children}</AppShell>
        </ReactQueryProvider>
      </body>
    </html>
  );
}