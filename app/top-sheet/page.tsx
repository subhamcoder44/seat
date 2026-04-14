'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Printer, 
  ArrowLeft, 
  RefreshCw, 
  Upload, 
  UserPlus, 
  UserMinus, 
  CheckCircle2,
  XCircle,
  Hash,
  BookOpen,
  Users,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Candidate {
  id: string;
  regNo: string;
  rollNo?: string;
  isAbsent: boolean;
}

export default function TopSheetPage() {
  const { rooms, students, loadFromLocalStorage } = useAppState();
  
  // State for generation mode
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Selection State
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Form Config
  const [institution, setInstitution] = useState('BPC INSTITUTE OF TECHNOLOGY');
  const [examName, setExamName] = useState('Academic Session 2025-2026');
  const [questionCode, setQuestionCode] = useState('');
  const [branch, setBranch] = useState('');
  const [subjectTitle, setSubjectTitle] = useState('');
  const [semester, setSemester] = useState('');
  const [examDate, setExamDate] = useState('');
  const [rollCodePrefix, setRollCodePrefix] = useState('REG NO:');
  const [isHalf1, setIsHalf1] = useState(false);
  const [isHalf2, setIsHalf2] = useState(false);

  // Candidate Data State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Derive subjects from room
  const availableGroups = useMemo(() => {
    if (!selectedRoomId) return [];
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return [];
    
    // Group by Dept-Sem
    const groups = new Set<string>();
    room.seats.filter(s => s.studentId).forEach(seat => {
      const student = students.find(st => st.id === seat.studentId || st.roll === seat.studentId || st.reg_no === seat.studentId);
      if (student) {
        groups.add(`${student.department || 'OTHER'} - ${student.sem || '-'}`);
      }
    });
    return Array.from(groups);
  }, [selectedRoomId, rooms, students]);

  // Sync Candidates from Allocations
  const syncFromAllocations = () => {
    if (!selectedRoomId || !selectedSubject) {
      toast.error('Please select a Room and Subject group first');
      return;
    }
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;

    const [dept, sem] = selectedSubject.split(' - ');
    const matched: Candidate[] = [];
    
    room.seats.filter(s => s.studentId).forEach(seat => {
      const student = students.find(st => st.id === seat.studentId || st.roll === seat.studentId || st.reg_no === seat.studentId);
      if (student && student.department === dept && student.sem === sem) {
        matched.push({
          id: student.id || Math.random().toString(),
          regNo: student.reg_no || student.roll || seat.studentId!,
          rollNo: student.roll,
          isAbsent: false
        });
      }
    });

    setCandidates(matched.sort((a,b) => a.regNo.localeCompare(b.regNo)));
    toast.success(`Synced ${matched.length} registration numbers from database`);
  };

  // CSV Import
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      const newCandidates: Candidate[] = data
        .slice(1) // Skip header
        .filter(row => row[0])
        .map((row, idx) => ({
          id: `csv-${Date.now()}-${idx}`,
          regNo: String(row[0]).trim(),
          isAbsent: false
        }));

      setCandidates(newCandidates);
      toast.success(`Imported ${newCandidates.length} registration numbers from CSV`);
    };
    reader.readAsBinaryString(file);
  };

  const toggleAbsent = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, isAbsent: !c.isAbsent } : c));
  };

  const handleGenerate = () => {
    if (candidates.length === 0) {
      toast.error('No candidates loaded. Sync from DB or upload CSV first.');
      return;
    }
    setIsGenerating(true);
  };

  const presentList = candidates.filter(c => !c.isAbsent).map(c => c.regNo);
  const absentList = candidates.filter(c => c.isAbsent).map(c => c.regNo);

  const handlePrint = () => {
    window.print();
  };

  if (isGenerating) {
    // -------------------------------------------------------------------------------- //
    //  Official Template View
    // -------------------------------------------------------------------------------- //
    const COL_COUNT = 4;
    const numRows = Math.max(15, Math.ceil(presentList.length / COL_COUNT));
    const gridData = [];
    
    for (let i = 0; i < numRows; i++) {
       const row = [];
       for (let j = 0; j < COL_COUNT; j++) {
           const index = i * COL_COUNT + j;
           row.push(index < presentList.length ? presentList[index] : '---');
       }
       gridData.push(row);
    }

    return (
      <div className="min-h-screen bg-slate-50 print:bg-white pb-20 print:pb-0">
          <div className="max-w-4xl mx-auto pt-8 px-6 print:hidden mb-12 flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-xl border border-slate-200">
              <Button variant="ghost" onClick={() => setIsGenerating(false)} className="gap-2 font-bold hover:bg-slate-100 rounded-xl">
                  <ArrowLeft size={16}/> Back to Editor
              </Button>
              <div className="flex gap-4">
                 <Button onClick={handlePrint} className="gap-2 bg-blue-600 text-white hover:bg-blue-700 font-black px-8 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                     <Printer size={18}/> Print Official Top Sheet
                 </Button>
              </div>
          </div>

          <div className="max-w-[850px] mx-auto bg-white border border-slate-400 p-12 text-black font-serif print:p-0 print:border-none print:w-full min-h-[1050px] flex flex-col relative overflow-hidden">
              
              {/* Header Box */}
              <div className="flex justify-between items-start mb-8">
                  <div className="border border-black p-3 text-[11px] leading-tight font-bold w-48">
                    {institution.toUpperCase()}<br/>
                    {examName.toUpperCase()}
                  </div>
                  <div className="text-center">
                    <h1 className="text-2xl font-black uppercase tracking-[0.2em] underline underline-offset-8 mb-2">TOP SHEET</h1>
                    <p className="text-[10px] font-bold uppercase max-w-[300px] mx-auto text-slate-500">Official Exam Record of West Bengal State Council</p>
                  </div>
                  <div className="border-2 border-black p-3 text-center min-w-[120px]">
                      <div className="text-[9px] font-black uppercase mb-1">Q-Code</div>
                      <div className="text-xl font-black text-red-600">{questionCode || '---'}</div>
                  </div>
              </div>

              {/* Form Metadata */}
              <div className="grid grid-cols-1 gap-2 mb-8 text-sm font-bold border-b-2 border-black pb-6">
                <div className="flex gap-2">Institution: <span className="text-red-700">{institution}</span></div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex gap-2">Branch: <span className="text-red-700">{branch || '---'}</span></div>
                  <div className="flex gap-2 justify-end">Half: <span className="px-3 border border-black ml-2 font-black">{isHalf1 ? '1' : isHalf2 ? '2' : '-'}</span></div>
                </div>
                <div className="flex gap-2">Subject: <span className="text-red-700">{subjectTitle || '---'}</span></div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="flex gap-2">Semester: <span className="text-red-700">{semester || '---'}</span></div>
                   <div className="flex gap-2">Exam Date: <span className="text-red-700">{examDate || '---'}</span></div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="flex-1 flex flex-col">
                <table className="w-full border-collapse border border-black text-xs">
                  <thead>
                    <tr>
                      <th colSpan={5} className="border border-black p-2 bg-slate-50 uppercase tracking-widest text-[10px]">Candidate Details (Answer Scripts Enclosed)</th>
                      <th colSpan={2} className="border border-black p-2 bg-slate-50 uppercase tracking-widest text-[10px]">Absentees</th>
                    </tr>
                    <tr>
                      <th className="border border-black p-1 w-[12%]">{rollCodePrefix}</th>
                      <th className="border border-black p-1 w-[15%]">Registration</th>
                      <th className="border border-black p-1 w-[15%]">Registration</th>
                      <th className="border border-black p-1 w-[15%]">Registration</th>
                      <th className="border border-black p-1 w-[15%]">Registration</th>
                      <th className="border border-black p-1 w-[12%]">Prefix</th>
                      <th className="border border-black p-1 w-auto">Registration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridData.map((row, rIdx) => (
                      <tr key={rIdx} className="h-7">
                        {rIdx === 0 && (
                          <td rowSpan={numRows} className="border border-black p-1 align-middle text-center font-black bg-slate-50/50 break-words text-[9px]">
                            {rollCodePrefix}
                          </td>
                        )}
                        {row.map((reg, i) => (
                          <td key={i} className={`border border-black p-1 text-center font-bold ${reg === '---' ? 'text-slate-200' : 'text-red-600'}`}>
                            {reg}
                          </td>
                        ))}
                        {rIdx === 0 && (
                          <>
                            <td rowSpan={numRows} className="border border-black p-1 align-middle text-center font-black bg-slate-50/50 text-[9px]">
                              {rollCodePrefix}
                            </td>
                            <td rowSpan={numRows} className="border border-black p-2 align-top text-center text-red-600 font-bold space-y-1">
                               {absentList.map((abs, idx) => <div key={idx}>{abs}</div>)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-black">
                      <td colSpan={5} className="border border-black p-4 text-sm">
                        TOTAL SCRIPTS ENCLOSED: <span className="text-red-600 text-lg ml-2">{presentList.length.toString().padStart(2, '0')} NOS.</span>
                      </td>
                      <td colSpan={2} className="border border-black p-4 text-sm">
                        TOTAL ABSENT: <span className="text-red-600 text-lg ml-2">{absentList.length.toString().padStart(2, '0')} NOS.</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signature Section */}
              <div className="mt-12 space-y-16">
                 <p className="text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Certified that above contents are sealed in our presence</p>
                 <div className="flex justify-between items-end px-4">
                    <div className="text-center">
                       <div className="w-48 border-b border-black mb-2"></div>
                       <p className="text-[10px] font-black uppercase">Observer Signature</p>
                    </div>
                    <div className="text-center">
                       <div className="w-64 border-b border-black mb-2"></div>
                       <p className="text-[10px] font-black uppercase">Centre-in-Charge Signature (Seal)</p>
                    </div>
                 </div>
              </div>

              {/* Watermark in corner */}
              <div className="absolute top-4 right-4 opacity-10 print:hidden">
                 <FileText size={40} className="text-slate-300" />
              </div>

          </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-10 pb-20">
          {/* Main Title Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-950 p-10 rounded-[2.5rem] border shadow-2xl relative overflow-hidden">
             <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-600/5 -skew-x-12 translate-x-32"></div>
             <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-500/20 text-white">
                      <FileText className="h-8 w-8" />
                   </div>
                   <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Official Top Sheet</h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
                  Manual absentee management with automated registration number fetching from Database or CSV.
                </p>
             </div>
             
             <div className="flex flex-wrap gap-4 relative z-10">
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-14 px-6 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 font-bold gap-3 shadow-md group">
                   <Upload className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                   Import Candidate CSV
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv,.xlsx" className="hidden" />
                
                <Button 
                   onClick={handleGenerate} 
                   disabled={candidates.length === 0}
                   className="h-14 px-10 bg-slate-900 hover:bg-black text-white rounded-2xl font-black gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                   Generate Template
                   <Badge className="bg-blue-500 px-3">{candidates.length}</Badge>
                </Button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             {/* Left Column: Config */}
             <div className="lg:col-span-4 space-y-8">
                <Card className="p-8 rounded-[2rem] border-slate-200 shadow-xl bg-white space-y-6">
                   <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-4">
                      <BookOpen className="text-blue-600" />
                      <h2 className="text-xl font-bold">Scope Selection</h2>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Target Room</Label>
                         <select 
                            className="flex h-12 w-full rounded-xl border border-input bg-slate-50 px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                            value={selectedRoomId}
                            onChange={(e) => {
                                setSelectedRoomId(e.target.value);
                                setSelectedSubject('');
                                setCandidates([]);
                            }}
                         >
                            <option value="">Select Examination Room...</option>
                            {rooms.filter(r => r.seats.some(s => s.studentId)).map((r) => (
                                <option key={r.id} value={r.id}>{r.name} {r.building ? `(${r.building})` : ''}</option>
                            ))}
                         </select>
                      </div>

                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Branch-Semester Group</Label>
                         <select 
                            className="flex h-12 w-full rounded-xl border border-input bg-slate-50 px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            disabled={!selectedRoomId}
                         >
                            <option value="">Select Group...</option>
                            {availableGroups.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                         </select>
                      </div>

                      <Button 
                         onClick={syncFromAllocations} 
                         disabled={!selectedSubject}
                         variant="secondary"
                         className="w-full h-12 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold gap-2"
                      >
                         <RefreshCw className="h-4 w-4" />
                         Sync Registrations from DB
                      </Button>
                   </div>
                </Card>

                <Card className="p-8 rounded-[2rem] border-slate-200 shadow-xl bg-white space-y-6">
                   <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-4 text-slate-900">
                      <Settings2 className="text-red-600 h-5 w-5" />
                      <h2 className="text-xl font-bold">Header Metadata</h2>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Institution</Label>
                        <Input value={institution} onChange={e => setInstitution(e.target.value)} className="bg-slate-50 border-none font-bold rounded-xl h-10" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Q-Code</Label>
                          <Input value={questionCode} onChange={e => setQuestionCode(e.target.value)} placeholder="104(N)" className="bg-slate-50 border-none font-black text-red-600 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Select Half</Label>
                          <div className="flex gap-2">
                            <button 
                               onClick={() => { setIsHalf1(!isHalf1); setIsHalf2(false); }}
                               className={`flex-1 h-10 rounded-xl font-bold text-xs transition-colors ${isHalf1 ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                            >H1</button>
                            <button 
                               onClick={() => { setIsHalf2(!isHalf2); setIsHalf1(false); }}
                               className={`flex-1 h-10 rounded-xl font-bold text-xs transition-colors ${isHalf2 ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                            >H2</button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subject Title</Label>
                        <Input value={subjectTitle} onChange={e => setSubjectTitle(e.target.value)} className="bg-slate-50 border-none rounded-xl" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Branch</Label>
                          <Input value={branch} onChange={e => setBranch(e.target.value)} className="bg-slate-50 border-none rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Semester</Label>
                          <Input value={semester} onChange={e => setSemester(e.target.value)} className="bg-slate-50 border-none rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Exam Date</Label>
                        <Input value={examDate} onChange={e => setExamDate(e.target.value)} placeholder="DD-MM-YYYY" className="bg-slate-50 border-none rounded-xl" />
                      </div>
                   </div>
                </Card>
             </div>

             {/* Right Column: Absentee Dashboard */}
             <div className="lg:col-span-8">
                <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl bg-white overflow-hidden min-h-[600px] flex flex-col">
                   <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                      <div>
                         <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <Users className="text-blue-400" />
                            Candidate Checklist
                         </h2>
                         <p className="text-slate-400 text-xs mt-1 font-medium">Click on a Registration Number to mark them as Absent.</p>
                      </div>
                      <div className="flex gap-10">
                         <div className="text-center">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Present</p>
                            <p className="text-3xl font-black">{presentList.length}</p>
                         </div>
                         <div className="text-center">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Absent</p>
                            <p className="text-3xl font-black text-red-500">{absentList.length}</p>
                         </div>
                      </div>
                   </div>

                   <div className="p-8 flex-1">
                      {candidates.length > 0 ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                            {candidates.map((c) => (
                               <button 
                                  key={c.id}
                                  onClick={() => toggleAbsent(c.id)}
                                  className={`relative group p-4 rounded-2xl border-2 transition-all duration-300 text-center flex flex-col items-center justify-center gap-2 overflow-hidden ${
                                    c.isAbsent 
                                      ? 'bg-red-50 border-red-200 text-red-600 ring-4 ring-red-100' 
                                      : 'bg-white border-slate-100 hover:border-blue-400 hover:shadow-xl text-slate-800'
                                  }`}
                               >
                                  <div className={`p-2 rounded-xl transition-colors ${c.isAbsent ? 'bg-red-100' : 'bg-slate-50 group-hover:bg-blue-50'}`}>
                                     {c.isAbsent ? <XCircle size={18} /> : <CheckCircle2 size={18} className="text-slate-300 group-hover:text-blue-500" />}
                                  </div>
                                  <span className="text-xs font-black tracking-tight">{c.regNo}</span>
                                  {c.isAbsent && (
                                     <div className="absolute top-0 right-0 p-1">
                                        <Badge className="bg-red-600 text-[8px] px-1 h-3 flex items-center justify-center">ABSENT</Badge>
                                     </div>
                                  )}
                               </button>
                            ))}
                         </div>
                      ) : (
                         <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-32">
                            <div className="p-6 bg-slate-50 rounded-[2rem] text-slate-300 shadow-inner">
                               <Hash size={60} />
                            </div>
                            <div>
                               <h3 className="text-lg font-bold text-slate-400">No Candidates Loaded</h3>
                               <p className="text-slate-300 text-sm font-medium">Sync with Database or upload a CSV to start marking.</p>
                            </div>
                         </div>
                      )}
                   </div>
                   
                   {candidates.length > 0 && (
                      <div className="p-8 bg-slate-50 border-t flex justify-between items-center">
                         <div className="flex gap-2">
                           <Badge variant="outline" className="bg-white border-slate-200 px-4 py-2 font-bold text-slate-500">
                             {presentList.length + absentList.length} Total Registered
                           </Badge>
                         </div>
                         <Button variant="ghost" onClick={() => setCandidates([])} className="text-xs font-bold text-slate-400 hover:text-red-500">
                            Clear Current List
                         </Button>
                      </div>
                   )}
                </Card>
             </div>
          </div>
      </div>
    </MainLayout>
  );
}
