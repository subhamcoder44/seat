'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppState } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Printer, ArrowLeft } from 'lucide-react';

export default function TopSheetPage() {
  const { rooms, students, loadFromLocalStorage } = useAppState();
  
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Form fields matching the top sheet header
  const [examName, setExamName] = useState('External Theoretical Examination (JAN 2026)');
  const [questionCode, setQuestionCode] = useState('104(N)');
  const [centreName, setCentreName] = useState('BPC INSTITUTE OF TECHNOLOGY');
  const [branch, setBranch] = useState('CE');
  const [subjectTitle, setSubjectTitle] = useState('Mathematics-I');
  const [semester, setSemester] = useState('1ST');
  const [examDate, setExamDate] = useState('30.01.2026');
  const [rollCode, setRollCode] = useState('DBPCCE S1');
  const [absentNumbers, setAbsentNumbers] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Derive unique subject groups from the selected room
  const availableSubjects = useMemo(() => {
    if (!selectedRoomId) return [];
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return [];
    
    const subjects = new Set<string>();
    room.seats.filter(s => s.studentId).forEach(seat => {
        const student = students.find(st => st.id === seat.studentId || st.roll === seat.studentId || st.reg_no === seat.studentId);
        if (student && student.name) {
           let gName = `${student.sem ? student.sem + ' - ' : ''}${student.name}`;
           subjects.add(gName);
        } else {
           subjects.add('General Form');
        }
    });
    return Array.from(subjects);
  }, [selectedRoomId, rooms, students]);

  // When room or subject changes, auto-fill some properties if possible
  useEffect(() => {
      if (selectedSubject) {
          // Attempt to parse "Sem - Branch"
          const parts = selectedSubject.split(' - ');
          if (parts.length >= 2) {
              setSemester(parts[0].toUpperCase());
              setBranch(parts[1].toUpperCase());
              setRollCode(`DBPCCE ${parts[0][0] || 'S1'}`);
          }
      }
  }, [selectedSubject]);

  const targetStudents = useMemo(() => {
     if (!selectedRoomId || !selectedSubject || !isGenerating) return [];
     const room = rooms.find(r => r.id === selectedRoomId);
     if (!room) return [];
     
     const matched: string[] = [];
     room.seats.filter(s => s.studentId).forEach(seat => {
         const student = students.find(st => st.id === seat.studentId || st.roll === seat.studentId || st.reg_no === seat.studentId);
         let gName = 'General Form';
         let rollNo = seat.studentId;

         if (student && student.name) {
             gName = `${student.sem ? student.sem + ' - ' : ''}${student.name}`;
             rollNo = student.roll || student.reg_no || seat.studentId!;
         }

         if (gName === selectedSubject) {
             matched.push(rollNo!);
         }
     });
     
     return matched.sort((a,b) => a.localeCompare(b));
  }, [selectedRoomId, selectedSubject, isGenerating, rooms, students]);

  const handleGenerate = () => {
     if (!selectedRoomId || !selectedSubject) {
         alert("Please select a Room and Subject Group first.");
         return;
     }
     setIsGenerating(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // -------------------------------------------------------------------------------- //
  //  Print Template Logic
  // -------------------------------------------------------------------------------- //
  
  const presentCount = targetStudents.length;
  // Format the grid (4 columns wide)
  const COL_COUNT = 4;
  const numRows = Math.max(1, Math.ceil(presentCount / COL_COUNT));
  
  const rowsData = [];
  for (let i = 0; i < numRows; i++) {
     const row = [];
     for (let j = 0; j < COL_COUNT; j++) {
         const index = i * COL_COUNT + j;
         if (index < presentCount) {
             row.push(targetStudents[index]);
         } else {
             row.push('X'); // Blank spot in a partially filled row
         }
     }
     rowsData.push(row);
  }
  
  // Pad out some empty rows (XXX) to make it look like a full form, e.g., minimum 15 rows
  const MIN_ROWS = 15;
  if (rowsData.length < MIN_ROWS) {
      const extraRows = MIN_ROWS - rowsData.length;
      for (let i=0; i < extraRows; i++) {
          rowsData.push(['XXX', 'XXX', 'XXX', 'XXX']); // Empty row filler
      }
  }

  const absentList = absentNumbers.split(',').map(s => s.trim()).filter(Boolean);
  const absentCount = absentList.length;

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-12 print:bg-white print:pb-0">
         {/* Non-print controls */}
         <div className="max-w-4xl mx-auto pt-8 px-6 print:hidden mb-6 flex justify-between items-center">
             <Button variant="outline" onClick={() => setIsGenerating(false)} className="gap-2 bg-white">
                 <ArrowLeft size={16}/> Back to Editor
             </Button>
             <Button onClick={handlePrint} className="gap-2 bg-slate-800 text-white hover:bg-slate-700">
                 <Printer size={16}/> Print Top Sheet
             </Button>
         </div>

         {/* TOP SHEET A4 CONTAINER */}
         <div className="max-w-[800px] mx-auto bg-white border border-slate-300 shadow-xl print:shadow-none print:border-none print:w-full sm:px-12 px-6 py-12 text-black font-serif">
             
             {/* HEADER STRIP */}
             <div className="flex justify-between items-start mb-6">
                 <div className="border border-black px-4 py-2 text-center text-sm">
                     {examName.split('(')[0]}<br/>
                     ({examName.split('(')[1]}
                 </div>
                 <div className="border border-black px-4 py-2 text-center">
                     <div className="text-sm">Question Code:</div>
                     <div className="font-bold text-red-600 text-lg">{questionCode}</div>
                 </div>
             </div>

             {/* MAIN TITLE */}
             <div className="text-center mb-6">
                 <h1 className="text-2xl font-bold tracking-widest uppercase underline underline-offset-4 mb-2">Top Sheet</h1>
                 <h2 className="text-sm font-semibold uppercase">West Bengal State Council of Technical & Vocational Education<br/>And Skill Development</h2>
             </div>

             {/* META DETAILS */}
             <div className="space-y-2 mb-4 text-sm font-medium">
                 <div>Name of the Centre of Examination: <span className="font-bold text-red-600">{centreName}</span></div>
                 <div>Name of the Branch: <span className="font-bold text-red-600">{branch}</span></div>
                 <div>Name of the Subject: <span className="font-bold text-red-600">{subjectTitle}</span></div>
                 <div className="flex gap-16">
                     <div>Semester: <span className="font-bold text-red-600">{semester}</span></div>
                     <div>Question Code: <span className="font-bold text-red-600">{questionCode}</span></div>
                 </div>
                 <div>Date of Examination: <span className="font-bold text-red-600">{examDate}</span></div>
             </div>

             {/* THE BIG TABLE */}
             <table className="w-full border-collapse border border-black text-sm text-center mb-2">
                 <thead>
                     <tr className="border border-black">
                         <th colSpan={5} className="font-bold border border-black py-2">Details of the candidate(s) whose answer scripts are enclosed in the packet</th>
                         <th colSpan={2} className="font-bold border border-black py-2">Details of the candidate(s)<br/>who are absent</th>
                     </tr>
                     <tr className="border border-black">
                         <th className="border border-black py-1 font-normal w-[15%]">Roll</th>
                         <th className="border border-black py-1 font-normal w-[15%]">Number</th>
                         <th className="border border-black py-1 font-normal w-[15%]">Number</th>
                         <th className="border border-black py-1 font-normal w-[15%]">Number</th>
                         <th className="border border-black py-1 font-normal w-[15%]">Number</th>
                         <th className="border border-black py-1 font-normal w-[12%]">Roll</th>
                         <th className="border border-black py-1 font-normal w-[13%]">Number</th>
                     </tr>
                 </thead>
                 <tbody>
                     {rowsData.map((rowArr, rowIdx) => (
                         <tr key={rowIdx}>
                             {/* The Roll is only printed once vertically aligned middle, or just repeated. The spec shows it spanning. */}
                             {rowIdx === 0 && (
                                 <td className="border border-black text-red-600 font-bold font-sans align-middle" rowSpan={rowsData.length}>
                                     {rollCode}
                                 </td>
                             )}
                             {/* The 4 numbers */}
                             {rowArr.map((num, i) => (
                                 <td key={i} className={`border border-black py-1 font-sans font-medium ${num.includes('X') ? 'text-red-600' : 'text-red-500'}`}>
                                     {num}
                                 </td>
                             ))}

                             {/* Absent Column logic = spans all rows too, just lists them */}
                             {rowIdx === 0 && (
                                 <>
                                     <td className="border border-black text-red-600 font-bold font-sans align-middle" rowSpan={rowsData.length}>
                                         {absentCount > 0 ? rollCode : ''}
                                     </td>
                                     <td className="border border-black text-red-600 font-bold font-sans align-top p-2" rowSpan={rowsData.length}>
                                         <div className="flex flex-col gap-1">
                                             {absentList.map((abs, aIdx) => (
                                                 <span key={aIdx}>{abs}</span>
                                             ))}
                                         </div>
                                     </td>
                                 </>
                             )}
                         </tr>
                     ))}
                     
                     {/* Summary row */}
                     <tr className="border-t-[2px] border-black text-left">
                         <td colSpan={5} className="border border-black py-2 px-2 font-bold">
                             Total Number of answer scripts in the packet: <span className="text-red-600 font-sans">{presentCount.toString().padStart(2, '0')} NOS.</span>
                         </td>
                         <td colSpan={2} className="border border-black py-2 px-2 font-bold leading-tight">
                             Total Number of candidate(s)<br/>absent: <span className="text-red-600 font-sans">{absentCount.toString().padStart(2, '0')} NOS.</span>
                         </td>
                     </tr>
                 </tbody>
             </table>

             {/* FOOTER */}
             <div className="text-center text-xs font-semibold uppercase mb-12">
                 Certified that contents of the above packet have been sealed in our presence.
             </div>

             <div className="flex justify-between items-end mt-[80px]">
                 <div>
                     <div className="border-t border-black w-48 mb-1"></div>
                     <div className="text-sm">Signature of Observer<br/>Date: _________________</div>
                 </div>
                 <div>
                     <div className="border-t border-black w-64 mb-1"></div>
                     <div className="text-sm">Signature of Centre-in-Charge with official seal</div>
                 </div>
             </div>

         </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
          <div>
              <h1 className="text-3xl font-bold flex items-center gap-3"><FileText className="text-primary"/> Generate Top Sheet</h1>
              <p className="text-muted-foreground mt-2">Design an official printable Top Sheet by pulling dynamic seat allocations from a room.</p>
          </div>

          <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">1. Select Target Allocation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                       <Label>Target Room</Label>
                       <select 
                          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          value={selectedRoomId}
                          onChange={(e) => {
                              setSelectedRoomId(e.target.value);
                              setSelectedSubject('');
                          }}
                       >
                          <option value="">Select Room...</option>
                          {rooms.filter(r => r.seats.some(s => s.studentId)).map((r, idx) => (
                              <option key={`${r.id}-${idx}`} value={r.id}>{r.name} {r.building ? `(${r.building})` : ''}</option>
                          ))}
                       </select>
                  </div>

                  <div className="space-y-2">
                       <Label>Subject Group</Label>
                       <select 
                          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          disabled={!selectedRoomId}
                       >
                          <option value="">Select Subject Group...</option>
                          {availableSubjects.map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                          ))}
                       </select>
                  </div>
              </div>
          </Card>

          <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">2. Customizing Top Sheet Headings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-6">
                  <div className="space-y-2">
                      <Label>Exam Category (Top Left)</Label>
                      <Input value={examName} onChange={e => setExamName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Question Code</Label>
                      <Input value={questionCode} onChange={e => setQuestionCode(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Centre Name</Label>
                      <Input value={centreName} onChange={e => setCentreName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input value={branch} onChange={e => setBranch(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Subject Title</Label>
                      <Input value={subjectTitle} onChange={e => setSubjectTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Semester</Label>
                      <Input value={semester} onChange={e => setSemester(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Date of Examination</Label>
                      <Input value={examDate} onChange={e => setExamDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Roll Code Prefix (Vertical Table Header)</Label>
                      <Input value={rollCode} onChange={e => setRollCode(e.target.value)} />
                  </div>
              </div>
          </Card>

          <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 border-b pb-2 text-red-600">3. Absentee Management</h2>
              <div className="space-y-2">
                  <Label>Absent Student Rolls/Numbers (Comma Separated)</Label>
                  <Textarea 
                     value={absentNumbers} 
                     onChange={e => setAbsentNumbers(e.target.value)}
                     placeholder="e.g. 10003963, 10003991, X..."
                     className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">If students dynamically fetched are absent, list their numbers here to populate the Absent column.</p>
              </div>
          </Card>

          <div className="flex justify-end gap-4 pb-12">
              <Button onClick={handleGenerate} size="lg" className="w-full md:w-auto font-bold bg-primary px-12">
                 Generate Official Top Sheet Template
              </Button>
          </div>
      </div>
    </MainLayout>
  );
}
