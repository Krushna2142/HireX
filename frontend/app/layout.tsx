// frontend/app/layout.tsx
import './styles/globals.css';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/components/providers/AuthProvider';
import ReactQueryProvider from './_providers/ReactQueryProvider';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from '@/components/providers/SocketProvider';

export const metadata = {
  title: 'HireX | AI-Powered Career Platform',
  description: 'Land your next opportunity faster with AI. Resume analysis, ATS scoring, job recommendations, and mock interviews.',
  keywords: 'AI jobs, resume analysis, ATS scoring, job search, career platform, HireX',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
          storageKey="hirex-theme"
        >
          <ReactQueryProvider>
            <AuthProvider>
              <SocketProvider>
                {children}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    style: {
                      background: '#111827',
                      color: '#F1F5F9',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontFamily: "'Sora', sans-serif",
                    },
                    success: {
                      iconTheme: {
                        primary: '#10B981',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#F87171',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </SocketProvider>
            </AuthProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}