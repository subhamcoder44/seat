'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, Layers3 } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/use-auth';

export default function SignInPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_38%,#f8fafc_100%)] px-6 py-12">
      <div className="absolute left-[-6rem] top-[-6rem] h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="absolute bottom-[-8rem] right-[-4rem] h-80 w-80 rounded-full bg-orange-100/70 blur-3xl" />

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to welcome page
        </Link>

        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_100px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mb-8 flex items-center justify-center gap-3 text-center">
            <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
              <Layers3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-950">ExamMaster</p>
              <p className="text-sm text-slate-500">Seating Layout Generator</p>
            </div>
          </div>

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
