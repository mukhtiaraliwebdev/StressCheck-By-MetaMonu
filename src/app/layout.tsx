
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppSidebar } from '@/components/AppSidebar';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'; // Import SidebarProvider and SidebarTrigger

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'StressCall',
  description: 'Monitor and analyze stress levels through voice.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <SidebarProvider defaultOpen> {/* SidebarProvider wraps the main layout */}
            <div className="flex min-h-screen">
              <AppSidebar />
              <div className="flex-1 flex flex-col">
                <header className="sticky top-0 z-10 flex h-[57px] items-center justify-between gap-1 border-b bg-background px-4"> {/* Changed to justify-between */}
                  <div className="md:hidden"> {/* Visible only on mobile */}
                    <SidebarTrigger /> {/* Hamburger icon to toggle sidebar */}
                  </div>
                  <div className="hidden md:flex md:flex-1"> {/* Empty div to push UserProfileDropdown to the right on desktop if SidebarTrigger is hidden */}
                  </div>
                  <UserProfileDropdown />
                </header>
                <main className="flex-1 p-4 md:p-8 overflow-auto">
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
