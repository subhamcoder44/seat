'use client';

import { useAppState } from '@/hooks/use-app-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

export function GlobalFilterBar() {
  const { students, globalFilters, setGlobalFilters, resetFilters } = useAppState();

  // Extract unique values for filters
  const colleges = Array.from(new Set(students.map((s) => s.inst_name).filter(Boolean))).sort();
  const semesters = Array.from(new Set(students.map((s) => s.sem).filter(Boolean))).sort();
  const departments = Array.from(new Set(students.map((s) => s.department).filter(Boolean))).sort();

  const hasActiveFilters = 
    globalFilters.college !== 'all' || 
    globalFilters.semester !== 'all' || 
    globalFilters.department !== 'all';

  return (
    <div className="w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-500 mr-2">
            <Filter size={16} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Global Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* College Filter */}
            <Select
              value={globalFilters.college}
              onValueChange={(value) => setGlobalFilters({ college: value })}
            >
              <SelectTrigger className="w-[180px] h-9 text-[11px] font-bold border-slate-200 bg-slate-50/50 dark:bg-slate-900/50">
                <SelectValue placeholder="All Colleges" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colleges</SelectItem>
                {colleges.map((college) => (
                  <SelectItem key={college} value={college}>
                    {college}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Semester Filter */}
            <Select
              value={globalFilters.semester}
              onValueChange={(value) => setGlobalFilters({ semester: value })}
            >
              <SelectTrigger className="w-[140px] h-9 text-[11px] font-bold border-slate-200 bg-slate-50/50 dark:bg-slate-900/50">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map((sem) => (
                  <SelectItem key={sem} value={sem}>
                    {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Department Filter */}
            <Select
              value={globalFilters.department}
              onValueChange={(value) => setGlobalFilters({ department: value })}
            >
              <SelectTrigger className="w-[160px] h-9 text-[11px] font-bold border-slate-200 bg-slate-50/50 dark:bg-slate-900/50">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={globalFilters.type}
              onValueChange={(value) => setGlobalFilters({ type: value })}
            >
              <SelectTrigger className="w-[140px] h-9 text-[11px] font-bold border-slate-200 bg-slate-50/50 dark:bg-slate-900/50">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-3 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors gap-2 text-[10px] font-bold uppercase tracking-tight"
              >
                <X size={14} />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
