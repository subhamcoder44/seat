'use client';

import { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  XCircle,
  Hash,
  Users,
  Settings2,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Candidate {
  id: string;
  regNo: string;
  isAbsent: boolean;
}

export default function TopSheetPage() {
  const { rooms, students, loadFromLocalStorage } = useAppState();
  
  // State for generation mode
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Selection State (Manual First)
  const [manualRoomName, setManualRoomName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [manualRegInput, setManualRegInput] = useState('');
  
  // Form Config
  const [institution, setInstitution] = useState('BPC INSTITUTE OF TECHNOLOGY');
  const [examName, setExamName] = useState('Academic Session 2025-2026');
  const [questionCode, setQuestionCode] = useState('');
  const [branch, setBranch] = useState('');
  const [subjectTitle, setSubjectTitle] = useState('');
  const [semester, setSemester] = useState('');
  const [examDate, setExamDate] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [rollCodePrefix, setRollCodePrefix] = useState('REG NO:');
  const [isHalf1, setIsHalf1] = useState(false);
  const [isHalf2, setIsHalf2] = useState(false);

  // Candidate Data State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Sync Candidates from Allocations (Utility)
  const syncFromAllocations = () => {
    if (!selectedRoomId) {
      toast.error('Please select a Room to sync from');
      return;
    }
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;

    const matched: Candidate[] = [];
    room.seats.filter(s => s.studentId).forEach(seat => {
      const student = students.find(st => st.id === seat.studentId || st.roll === seat.studentId || st.reg_no === seat.studentId);
      matched.push({
        id: `db-${student?.id || seat.studentId!}-${Math.random()}`,
        regNo: student?.reg_no || student?.roll || seat.studentId!,
        isAbsent: false
      });
    });

    setCandidates(matched.sort((a,b) => a.regNo.localeCompare(b.regNo, undefined, {numeric: true})));
    setManualRoomName(room.name);
    setRoomNo(room.name);
    toast.success(`Synced ${matched.length} candidates from ${room.name}`);
  };

  // Manual Add Candidate
  const handleAddManualCandidate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualRegInput.trim()) return;
    
    if (candidates.some(c => c.regNo === manualRegInput.trim().toUpperCase())) {
      toast.error('Registration number already in list');
      return;
    }

    const newCandidate: Candidate = {
      id: `manual-${Date.now()}`,
      regNo: manualRegInput.trim().toUpperCase(),
      isAbsent: false
    };

    setCandidates(prev => [...prev, newCandidate].sort((a,b) => a.regNo.localeCompare(b.regNo, undefined, {numeric: true})));
    setManualRegInput('');
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
          regNo: String(row[0]).trim().toUpperCase(),
          isAbsent: false
        }));

      setCandidates(newCandidates.sort((a,b) => a.regNo.localeCompare(b.regNo, undefined, {numeric: true})));
      toast.success(`Imported ${newCandidates.length} registration numbers from CSV`);
    };
    reader.readAsBinaryString(file);
  };

  const toggleAbsent = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, isAbsent: !c.isAbsent } : c));
  };

  const removeCandidate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const handleGenerate = () => {
    if (candidates.length === 0) {
      toast.error('No candidates loaded. Enter registration numbers first.');
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
              <div className="flex justify-between items-start mb-8">
                  <div className="border border-black p-3 text-[11px] font-bold w-48">
                    {institution.toUpperCase()}<br/>
                    {examName.toUpperCase()}
                  </div>
                  <div className="text-center">
                    <h1 className="text-2xl font-black uppercase tracking-[0.2em] underline underline-offset-8 mb-2">TOP SHEET</h1>
                    <p className="text-[10px] font-bold uppercase max-w-[300px] mx-auto text-slate-500 text-center">West Bengal State Council of Technical & Vocational Education AND Skill Development</p>
                  </div>
                  <div className="border-2 border-black p-3 text-center min-w-[120px]">
                      <div className="text-[9px] font-black uppercase mb-1">Q-Code</div>
                      <div className="text-xl font-black text-red-600">{questionCode || '---'}</div>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-1 mb-8 text-sm font-bold border-b-2 border-black pb-6">
                <div className="flex gap-2">Name of the Centre of Examination: <span className="text-red-700">{institution}</span></div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex gap-2">Name of the Branch: <span className="text-red-700">{branch || '---'}</span></div>
                  <div className="flex gap-2 justify-end">Half: <span className="px-3 border border-black ml-2 font-black">{isHalf1 ? '1' : isHalf2 ? '2' : '-'}</span></div>
                </div>
                <div className="flex gap-2">Name of the Subject: <span className="text-red-700">{subjectTitle || '---'}</span></div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="flex gap-2">Semester: <span className="text-red-700">{semester || '---'}</span></div>
                   <div className="flex gap-2">Question Code: <span className="text-red-700">{questionCode || '---'}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="flex gap-2 text-xs">Date of Examination: <span className="text-red-700">{examDate || '---'}</span></div>
                   <div className="flex gap-2 justify-end">Room No: <span className="text-red-700">{roomNo || '---'}</span></div>
                </div>
              </div>

              <div className="flex-1">
                <table className="w-full border-collapse border border-black text-xs">
                  <thead>
                    <tr>
                      <th colSpan={5} className="border border-black py-2 bg-slate-50 uppercase tracking-widest text-[10px]">Details of the candidate(s) whose answer scripts are enclosed in the packet</th>
                      <th colSpan={2} className="border border-black py-2 bg-slate-50 uppercase tracking-widest text-[10px]">Details of the candidate(s) who are absent</th>
                    </tr>
                    <tr className="bg-slate-50">
                      <th className="border border-black p-1 w-[12%]">Roll</th>
                      <th className="border border-black p-1 w-[15%]">Number</th>
                      <th className="border border-black p-1 w-[15%]">Number</th>
                      <th className="border border-black p-1 w-[15%]">Number</th>
                      <th className="border border-black p-1 w-[15%]">Number</th>
                      <th className="border border-black p-1 w-[12%]">Roll</th>
                      <th className="border border-black p-1 w-auto">Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridData.map((row, rIdx) => (
                      <tr key={rIdx} className="h-7 text-[11px]">
                        {rIdx === 0 && (
                          <td rowSpan={numRows} className="border border-black p-1 align-middle text-center font-black bg-slate-50/50">
                            {rollCodePrefix}
                          </td>
                        )}
                        {row.map((reg, i) => (
                          <td key={i} className={`border border-black p-1 text-center font-bold ${reg === '---' ? 'text-slate-100' : 'text-red-600'}`}>
                            {reg}
                          </td>
                        ))}
                        {rIdx === 0 && (
                          <>
                            <td rowSpan={numRows} className="border border-black p-1 align-middle text-center font-black bg-slate-50/50">
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
                        TOTAL NUMBER OF ANSWER SCRIPTS IN THE PACKET: <span className="text-red-600 text-lg ml-2">{presentList.length.toString().padStart(2, '0')} NOS.</span>
                      </td>
                      <td colSpan={2} className="border border-black p-4 text-sm">
                        TOTAL NUMBER OF CANDIDATE(S) ABSENT: <span className="text-red-600 text-lg ml-2">{absentList.length.toString().padStart(2, '0')} NOS.</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-8 space-y-12">
                 <p className="text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Certified that contents of the above packet have been sealed in our presence</p>
                 <div className="flex justify-between items-end px-4">
                    <div className="text-center">
                       <div className="w-48 border-b border-black mb-2"></div>
                       <p className="text-[11px] font-black uppercase">Signature of Observer<br/>Date: _______________</p>
                    </div>
                    <div className="text-center">
                       <div className="w-64 border-b border-black mb-1"></div>
                       <p className="text-[11px] font-black uppercase tracking-tight">Signature of Centre-in-Charge<br/>with official seal</p>
                    </div>
                 </div>
              </div>
          </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-950 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
             <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-blue-500/10 -skew-x-12 translate-x-16"></div>
             <div className="relative z-10 flex items-center gap-4">
                <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-600/20">
                   <FileText size={32} />
                </div>
                <div>
                   <h1 className="text-3xl font-black tracking-tight">Manual Top Sheet</h1>
                   <p className="text-slate-400 font-medium text-sm">Professional grid generator with individual candidate entry.</p>
                </div>
             </div>
             
             <div className="flex gap-4 relative z-10">
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-12 border-slate-700 bg-slate-900 text-white hover:bg-slate-800 font-bold gap-2 rounded-xl">
                   <Upload size={18} /> Import CSV
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv,.xlsx" className="hidden" />
                
                <Button onClick={handleGenerate} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black gap-2 shadow-lg shadow-blue-500/40 active:scale-95 transition-all">
                   Generate Report
                   <Badge className="bg-white text-blue-600 ml-1">{candidates.length}</Badge>
                </Button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             <div className="lg:col-span-4 space-y-6">
                <Card className="p-6 rounded-[1.5rem] border-slate-200 shadow-xl space-y-6 bg-white">
                   <h2 className="text-lg font-black flex items-center gap-2 border-b pb-4"><Settings2 className="text-red-500" /> Page Info (Manual)</h2>
                   
                   <div className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Target Room Name</Label>
                        <Input value={manualRoomName} onChange={e => {setManualRoomName(e.target.value); setRoomNo(e.target.value);}} placeholder="e.g. Room 101" className="h-10 bg-slate-50 font-bold rounded-xl" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Semester</Label>
                            <Input value={semester} onChange={e => setSemester(e.target.value)} placeholder="1ST" className="h-10 bg-slate-50 font-bold rounded-xl" />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Shift/Half</Label>
                            <div className="flex gap-1 h-10">
                               <button onClick={() => {setIsHalf1(!isHalf1); setIsHalf2(false)}} className={`flex-1 rounded-xl font-black text-xs transition-colors ${isHalf1 ? 'bg-slate-900 text-white' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}>H1</button>
                               <button onClick={() => {setIsHalf2(!isHalf2); setIsHalf1(false)}} className={`flex-1 rounded-xl font-black text-xs transition-colors ${isHalf2 ? 'bg-slate-900 text-white' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}>H2</button>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Subject Name</Label>
                        <Input value={subjectTitle} onChange={e => setSubjectTitle(e.target.value)} className="h-10 bg-slate-50 font-bold rounded-xl" />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Branch/Dept</Label>
                        <Input value={branch} onChange={e => setBranch(e.target.value)} className="h-10 bg-slate-50 font-bold rounded-xl" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Question Code</Label>
                            <Input value={questionCode} onChange={e => setQuestionCode(e.target.value)} className="h-10 bg-slate-50 font-black text-red-600 rounded-xl" />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Exam Date</Label>
                            <Input value={examDate} onChange={e => setExamDate(e.target.value)} className="h-10 bg-slate-50 font-bold text-xs rounded-xl" />
                         </div>
                      </div>
                   </div>
                </Card>

                <Card className="p-6 rounded-[1.5rem] border-slate-100 shadow-md bg-white border-t-4 border-t-blue-500">
                   <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pull from Database</h2>
                   <div className="space-y-3">
                      <select 
                         className="w-full h-10 rounded-xl border bg-slate-50 px-3 text-xs font-bold focus:ring-2 focus:ring-blue-400 transition-all"
                         value={selectedRoomId}
                         onChange={e => setSelectedRoomId(e.target.value)}
                      >
                         <option value="">Select Existing Room...</option>
                         {rooms.filter(r => r.seats.some(s => s.studentId)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <Button onClick={syncFromAllocations} variant="outline" className="w-full h-10 text-xs font-black gap-2 rounded-xl text-blue-600 border-blue-100 hover:bg-blue-50 text-center">
                         <RefreshCw size={14} /> Sync Registration Nos
                      </Button>
                   </div>
                </Card>
             </div>

             <div className="lg:col-span-8 flex flex-col gap-6">
                <Card className="rounded-[1.5rem] border-slate-200 shadow-2xl bg-white overflow-hidden flex flex-col min-h-[550px]">
                   <div className="bg-slate-900 px-8 py-10 flex justify-between items-center text-white relative">
                      <div className="absolute top-0 right-0 p-2 opacity-10"><Users size={120}/></div>
                      <div className="relative z-10">
                         <h3 className="text-2xl font-black flex items-center gap-3">
                            <Hash className="text-blue-400" /> 
                            Candidate Checklist
                         </h3>
                         <p className="text-slate-400 text-[11px] font-bold mt-2 uppercase tracking-widest pl-1">Manual Selection & Tracking</p>
                      </div>
                      <div className="flex gap-8 items-center relative z-10">
                         <div className="text-right border-l border-slate-800 pl-8">
                           <p className="text-[10px] font-black text-blue-400 tracking-tighter">PRESENT</p>
                           <p className="text-4xl font-black">{presentList.length}</p>
                         </div>
                         <div className="text-right border-l border-slate-800 pl-8">
                           <p className="text-[10px] font-black text-red-500 tracking-tighter">ABSENT</p>
                           <p className="text-4xl font-black text-red-600">{absentList.length}</p>
                         </div>
                      </div>
                   </div>

                   <div className="p-8 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1 space-y-2 w-full">
                         <Label className="text-[10px] font-black uppercase text-slate-500 pl-1">Add Single Registration Number</Label>
                         <div className="relative">
                            <Plus size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                            <Input 
                               placeholder="Type Registration & Press Enter..."
                               className="pl-10 h-12 rounded-xl border-slate-200 bg-white shadow-sm font-black tracking-wider text-lg"
                               value={manualRegInput}
                               onChange={e => setManualRegInput(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && handleAddManualCandidate()}
                            />
                         </div>
                      </div>
                      <Button onClick={handleAddManualCandidate} className="bg-blue-600 hover:bg-blue-700 h-12 px-10 rounded-xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all w-full sm:w-auto">
                         ADD
                      </Button>
                   </div>

                   <div className="p-8 flex-1 bg-white">
                      {candidates.length > 0 ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {candidates.map((c) => (
                               <div 
                                  key={c.id}
                                  onClick={() => toggleAbsent(c.id)}
                                  className={`relative cursor-pointer py-4 px-5 rounded-[1.25rem] border-2 transition-all duration-300 group ${
                                    c.isAbsent 
                                      ? 'bg-red-50 border-red-200 ring-4 ring-red-50 text-red-700' 
                                      : 'bg-white border-slate-100 hover:border-blue-400 hover:shadow-2xl'
                                  }`}
                               >
                                  <div className="flex items-center gap-4">
                                     <div className={`p-2 rounded-xl transition-all ${c.isAbsent ? 'bg-red-200 text-red-800' : 'bg-slate-50 group-hover:bg-blue-50'}`}>
                                        {c.isAbsent ? <XCircle size={18} /> : <CheckCircle2 size={18} className={c.isAbsent ? '' : 'text-slate-300 group-hover:text-blue-500'} />}
                                     </div>
                                     <span className="text-base font-black tracking-widest break-all leading-tight uppercase select-none flex-1">
                                        {c.regNo}
                                     </span>
                                     
                                     <button 
                                        onClick={(e) => removeCandidate(c.id, e)}
                                        className="p-2 hover:bg-red-100 hover:text-red-700 rounded-xl transition-colors text-slate-300 sm:opacity-0 group-hover:opacity-100"
                                     >
                                        <Trash2 size={16} />
                                     </button>
                                  </div>

                                  {c.isAbsent && (
                                     <div className="absolute -top-2 -right-1">
                                        <Badge className="bg-red-600 text-[9px] font-black px-2 h-4 flex items-center uppercase tracking-tighter">ABSENT</Badge>
                                     </div>
                                  )}
                               </div>
                            ))}
                         </div>
                      ) : (
                         <div className="flex flex-col items-center justify-center h-full py-20 text-slate-300 gap-6 opacity-40">
                            <div className="p-8 bg-slate-50 rounded-[3rem] shadow-inner"><Users size={80} /></div>
                            <p className="font-black uppercase tracking-[0.3em] text-sm">Checklist Empty</p>
                         </div>
                      )}
                   </div>

                   {candidates.length > 0 && (
                      <div className="px-8 py-4 bg-slate-50 border-t flex justify-between items-center">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{candidates.length} Registered Candidates Loaded</p>
                         <Button variant="ghost" onClick={() => setCandidates([])} className="text-[10px] font-black text-slate-400 hover:text-red-600 uppercase tracking-widest px-4 h-8 rounded-lg">
                            Clear All
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
