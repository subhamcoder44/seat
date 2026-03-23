'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Hash, Layers3, LayoutGrid, MapPin, School, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

const roomBlocks = [
  'left-[-4%] top-20 rotate-[-18deg]',
  'right-[-5%] top-16 rotate-[16deg]',
  'left-[6%] bottom-14 rotate-[18deg]',
  'right-[3%] bottom-8 rotate-[-14deg]',
];

export default function WelcomePage() {
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
    <main className="min-h-screen bg-[#f6efe8] text-slate-900">
      <header className="border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-6 py-6 text-center">
          <div className="rounded-2xl bg-amber-100 p-2 text-amber-700 shadow-sm shadow-amber-200/60">
            <Layers3 className="h-7 w-7" />
          </div>
          <div>
            <p className="text-3xl font-semibold tracking-tight">ExamMaster Seating Layout Generator</p>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff_0%,#fff8f1_30%,#f4ede4_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,158,11,0.06),transparent_24%,transparent_76%,rgba(245,158,11,0.06))]" />

        {roomBlocks.map((position, index) => (
          <div
            key={position}
            className={`absolute h-52 w-80 rounded-[2rem] border border-white/60 bg-white/55 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.09)] backdrop-blur-sm ${position}`}
          >
            <div className="flex h-full flex-col justify-between rounded-[1.5rem] border border-slate-200/70 bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <div className="h-8 w-16 rounded-full bg-slate-200/70" />
                <div className="h-12 w-6 rounded-full bg-amber-400/80" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, deskIndex) => (
                  <div
                    key={`${index}-${deskIndex}`}
                    className="space-y-1 rounded-xl border border-slate-200/60 bg-white/90 px-2 py-2 shadow-sm"
                  >
                    <div className="mx-auto h-2.5 w-6 rounded-full bg-slate-300/90" />
                    <div className="mx-auto h-5 w-8 rounded-md bg-amber-200/90" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="absolute inset-0 backdrop-blur-[5px]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-97px)] max-w-6xl items-center justify-center px-6 py-16">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white/82 px-8 py-12 text-center shadow-[0_30px_120px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:px-14">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-amber-100 text-amber-700 shadow-inner shadow-amber-200/70">
              <LayoutGrid className="h-11 w-11" strokeWidth={1.8} />
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-700">Smart Exam Planning</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                Seating Layout
                <span className="block">Generator</span>
              </h1>
              <p className="mx-auto max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Generate organized seating plans, manage rooms, and prepare exam halls with a cleaner workflow for your staff.
              </p>
            </div>

            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <Button
                  asChild
                  size="lg"
                  className="h-14 flex-1 rounded-2xl bg-amber-500 text-base font-semibold text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600"
                >
                  <Link href="/sign-in">
                    Staff Login
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 flex-1 rounded-2xl border-amber-500 text-amber-700 text-base font-semibold hover:bg-amber-50"
                >
                  <Link href="/search">
                    Find My Seat
                    <Search className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-slate-600">Not registered? Contact your administrator.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
