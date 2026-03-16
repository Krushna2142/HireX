// frontend/app/layout.tsx
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '../components/providers/AuthProvider';
import ReactQueryProvider from './_providers/ReactQueryProvider';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from '@/app/_components/shared/Sidebar'
export const metadata = {
  title: 'JobCrawler',
  description: 'AI Job Assistant • Jobs • Recommendations • Resume • Mock Interview • Chatbot • Dashboard',
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
          storageKey="ji-theme"
        >
          <ReactQueryProvider>
            <AuthProvider>
              {/*
                ✅ Navbar intentionally removed from root layout.

                Navigation is now handled at the route-segment level:

                  Public routes (/, /auth/*)
                  └── app/page.tsx renders its own minimal header
                      with Sign In / Get Started CTAs only.
                      No persistent nav — unauthenticated users see
                      nothing but the landing page.

                  Protected routes (/dashboard, /jobs, /profile, ...)
                  └── app/(protected)/layout.tsx mounts <Sidebar />
                      which is role-aware (candidate vs recruiter)
                      and only reachable after authentication.

                This separation is the correct Next.js App Router pattern:
                layouts are hierarchical and non-leaking by design.
                Never put authenticated UI in the root layout.
              */}

              {children}

              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background:   '#111827',
                    color:        '#F1F5F9',
                    border:       '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize:     '13px',
                    fontFamily:   "'Sora', sans-serif",
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
            </AuthProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}