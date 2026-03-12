// frontend/app/layout.tsx
import './globals.css';
import { ThemeProvider } from 'next-themes';
import Navbar from '../components/navigation/Navbar';
import { AuthProvider } from '../components/providers/AuthProvider';
import ReactQueryProvider from './_providers/ReactQueryProvider';

export const metadata = {
  title: 'JobCrawler',
  description: 'AI Job Assistant • Jobs • Recommendations • Resume • Mock Interview • Chatbot • Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Adding favicon */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="ji-theme">
          <ReactQueryProvider>
            <AuthProvider>
              <Navbar />
              {children}
            </AuthProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}