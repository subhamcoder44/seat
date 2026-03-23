'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, MapPin, User, Hash, School, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAppState } from '@/hooks/use-app-state';

export default function StudentSearchPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const { findStudentSeat } = useAppState();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    const searchResult = findStudentSeat(query.trim());
    setResult(searchResult);
    setSearched(true);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_38%,#f8fafc_100%)] px-6 py-12">
      {/* Background Decor */}
      <div className="absolute left-[-6rem] top-[-6rem] h-72 w-72 rounded-full bg-amber-200/50 blur-3xl opacity-50" />
      <div className="absolute bottom-[-8rem] right-[-4rem] h-80 w-80 rounded-full bg-orange-100/70 blur-3xl opacity-50" />

      <div className="relative w-full max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
            <Search className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Find My Exam Seat</h1>
          <p className="mt-3 text-slate-600">Enter your Registration Number or Roll Number to locate your seat.</p>
        </div>

        <Card className="overflow-hidden border-white/70 bg-white/90 p-1 shadow-[0_24px_100px_rgba(15,23,42,0.12)] backdrop-blur">
          <form onSubmit={handleSearch} className="flex p-2">
            <Input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="e.g. REG123456 or ROLL789"
              className="h-14 border-none bg-transparent text-lg focus-visible:ring-0"
              autoFocus
            />
            <Button type="submit" size="lg" className="h-14 rounded-xl bg-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600">
              Search
            </Button>
          </form>
        </Card>

        {searched && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {result ? (
              <Card className="overflow-hidden border-emerald-100 bg-white shadow-xl">
                <div className="bg-emerald-500 px-6 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Seat Found!</h2>
                    <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                      Confirmed
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 rounded-lg bg-slate-100 p-2 text-slate-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Student Name</p>
                          <p className="text-lg font-bold text-slate-900">{result.student.name}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="mt-1 rounded-lg bg-slate-100 p-2 text-slate-600">
                          <Hash className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Roll / Reg No.</p>
                          <p className="text-lg font-bold text-slate-900">{result.student.roll || result.student.reg_no}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="mt-1 rounded-lg bg-slate-100 p-2 text-slate-600">
                          <School className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Department</p>
                          <p className="text-lg font-bold text-slate-900">{result.student.sem} {result.student.name.includes('-') ? result.student.name.split('-')[0] : 'General'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100 flex flex-col items-center justify-center text-center">
                      <div className="mb-4 rounded-2xl bg-amber-100 p-4 text-amber-700">
                        <MapPin className="h-10 w-10" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Allocation Details</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-3xl font-black text-slate-950">Room {result.room.name}</p>
                        <p className="text-xl font-semibold text-amber-600">
                          Row {result.seat.row}, Seat {result.seat.column}
                        </p>
                      </div>
                      <div className="mt-6 flex gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm border border-slate-200">
                          Building {result.room.building}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm border border-slate-200">
                          Floor {result.room.floor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="border-red-100 bg-white p-12 text-center shadow-xl">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <Layers3 className="h-10 w-10 opacity-20" />
                </div>
                <h3 className="text-xl font-bold text-slate-950">No Allocation Found</h3>
                <p className="mt-2 text-slate-600">We couldn't find a seating record for "{query}". Please check your number and try again, or contact your department coordinator.</p>
                <Button variant="outline" onClick={() => {setSearched(false); setQuery('');}} className="mt-6 h-11 px-8 rounded-xl border-slate-200 hover:bg-slate-50">
                  Try Another Number
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
