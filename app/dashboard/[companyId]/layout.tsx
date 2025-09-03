'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: { companyId: string };
}

export default function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('isAuthenticated')) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar companyId={params.companyId} />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Fixed/Sticky Navbar */}
        <div className="sticky top-0 z-40 bg-background border-b flex-shrink-0">
          <Navbar companyId={params.companyId} />
        </div>
        {/* Main content area */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
