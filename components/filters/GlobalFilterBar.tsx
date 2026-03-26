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
import { Filter, X, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Trash2, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'sonner';

export function GlobalFilterBar() {
  const { 
    students, 
    globalFilters, 
    setGlobalFilters, 
    resetFilters,
    schedules,
    addSchedule,
    deleteSchedule
  } = useAppState();

  const [isManageOpen, setIsManageOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    date: '',
    time: '',
    semesters: [] as string[]
  });

  // Extract unique values for filters
  const colleges = Array.from(new Set(students.map((s) => s.inst_name).filter(Boolean))).sort();
  const semesters = Array.from(new Set(students.map((s) => s.sem).filter(Boolean))).sort();
  const departments = Array.from(new Set(students.map((s) => s.department).filter(Boolean))).sort();

  const hasActiveFilters = 
    globalFilters.college !== 'all' || 
    (globalFilters.semester.length > 0 && !globalFilters.semester.includes('all')) || 
    globalFilters.department !== 'all' ||
    globalFilters.type !== 'all' ||
    globalFilters.scheduleId !== 'all';

  const handleScheduleChange = (id: string) => {
    if (id === 'all') {
      setGlobalFilters({ scheduleId: 'all' });
      return;
    }
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
      setGlobalFilters({ 
        scheduleId: id,
        semester: schedule.semesters.length > 0 ? schedule.semesters : ['all']
      });
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.date || !newSchedule.time) {
      toast.error('Please fill in date and time');
      return;
    }
    await addSchedule(newSchedule);
    setNewSchedule({ date: '', time: '', semesters: [] });
    toast.success('Schedule added successfully');
  };

  const toggleSemester = (sem: string) => {
    let current = [...globalFilters.semester];
    if (sem === 'all') {
      current = ['all'];
    } else {
      // If 'all' was selected, remove it
      current = current.filter(s => s !== 'all');
      if (current.includes(sem)) {
        current = current.filter(s => s !== sem);
        if (current.length === 0) current = ['all'];
      } else {
        current.push(sem);
      }
    }
    setGlobalFilters({ semester: current });
  };

  return (
    <div className="w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-500 mr-2">
            <Filter size={16} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Global Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Exam Schedule Selector */}
            <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-800">
              <Select
                value={globalFilters.scheduleId}
                onValueChange={handleScheduleChange}
              >
                <SelectTrigger className="w-[200px] h-9 text-[11px] font-bold border-blue-200 bg-blue-50/30 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <SelectValue placeholder="Select Exam Session" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No Active Session</SelectItem>
                  {schedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.date} ({s.time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-blue-500 rounded-lg">
                    <Settings2 size={16} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Calendar className="text-blue-500" />
                      Manage Exam Schedules
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500">Date</label>
                          <input 
                            type="date" 
                            className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm"
                            value={newSchedule.date}
                            onChange={e => setNewSchedule({...newSchedule, date: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500">Time / Session</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 10AM - 1PM"
                            className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm"
                            value={newSchedule.time}
                            onChange={e => setNewSchedule({...newSchedule, time: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Target Semesters</label>
                        <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[44px]">
                          {semesters.map(sem => (
                            <Badge 
                              key={sem}
                              variant={newSchedule.semesters.includes(sem) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const current = newSchedule.semesters;
                                if (current.includes(sem)) {
                                  setNewSchedule({...newSchedule, semesters: current.filter(s => s !== sem)});
                                } else {
                                  setNewSchedule({...newSchedule, semesters: [...current, sem]});
                                }
                              }}
                            >
                              Sem {sem}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button className="w-full gap-2" onClick={handleAddSchedule}>
                        <Plus size={16} /> Add Schedule
                      </Button>
                    </div>

                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Existing Schedules</h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {schedules.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border text-xs">
                            <div>
                              <p className="font-bold">{s.date}</p>
                              <p className="text-slate-500">{s.time} • Sems: {s.semesters.join(', ')}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => deleteSchedule(s.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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

            {/* Semester Multi-select Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-[180px] h-9 text-[11px] font-bold border-slate-200 bg-slate-50/50 dark:bg-slate-900/50 justify-between px-3"
                >
                  <span className="truncate">
                    {globalFilters.semester.includes('all') || globalFilters.semester.length === 0
                      ? 'All Semesters' 
                      : `Sems: ${globalFilters.semester.sort().join(', ')}`}
                  </span>
                  <ChevronDown size={14} className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2 space-y-1">
                  <div 
                    className="flex items-center space-x-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                    onClick={() => toggleSemester('all')}
                  >
                    <Checkbox 
                      id="sem-all" 
                      checked={globalFilters.semester.includes('all')}
                      onCheckedChange={() => toggleSemester('all')}
                    />
                    <label 
                      htmlFor="sem-all" 
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                    >
                      All Semesters
                    </label>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  {semesters.map((sem) => (
                    <div 
                      key={sem}
                      className="flex items-center space-x-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                      onClick={() => toggleSemester(sem)}
                    >
                      <Checkbox 
                        id={`sem-${sem}`} 
                        checked={globalFilters.semester.includes(sem)}
                        onCheckedChange={() => toggleSemester(sem)}
                      />
                      <label 
                        htmlFor={`sem-${sem}`} 
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                      >
                        Semester {sem}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

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
