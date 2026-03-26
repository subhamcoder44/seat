'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GlobalFilterBar } from '@/components/filters/GlobalFilterBar';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 md:ml-64 flex flex-col">
          <GlobalFilterBar />
          <div className="p-6 flex-1">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
