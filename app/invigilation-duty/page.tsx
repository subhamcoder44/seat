'use client';

import React, { useState, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, 
  Printer, 
  Plus, 
  Trash2, 
  Upload, 
  Settings2,
  Table as TableIcon,
  Save,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface DateColumn {
  id: string;
  label: string;
  shifts: string[]; // e.g. ["H1", "H2", "H3", "H4"]
}

interface TeacherRow {
  id: string;
  name: string;
  roomNo: string;
  isHighlighted: boolean;
  assignments: Record<string, string>; // cellKey format: "dateId-shiftLabel"
}

export default function InvigilationDutyPage() {
  const [institution, setInstitution] = useState('BPC INSTITUTE OF TECHNOLOGY');
  const [address, setAddress] = useState('Krishnagar, Nadia');
  const [session, setSession] = useState('Academic Session 2025-2026');
  const [examName, setExamName] = useState('Even Semester 1st Internal Examination');
  
  // Stats
  const [stats, setStats] = useState({
    rooms: '12',
    invigilators: '35',
    groupD: '10'
  });

  const [dates, setDates] = useState<DateColumn[]>([
    { id: 'd1', label: '06-Apr', shifts: ['H1', 'H2', 'H3', 'H4'] },
    { id: 'd2', label: '07-Apr', shifts: ['H1', 'H2', 'H3', 'H4'] },
  ]);

  const [teachers, setTeachers] = useState<TeacherRow[]>([
    { id: 't1', name: 'Dr. Indranil Kundu', roomNo: '101', isHighlighted: true, assignments: {} },
    { id: 't2', name: 'Miss Madhabi Biswas', roomNo: '102', isHighlighted: false, assignments: {} },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats Logic - Auto calculate no of invigilators
  const autoInvCount = useMemo(() => {
    const assigned = new Set();
    teachers.forEach(t => {
      if (Object.values(t.assignments).some(v => v === '1')) {
        assigned.add(t.id);
      }
    });
    return assigned.size;
  }, [teachers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const newTeachers: TeacherRow[] = data
          .slice(1) // Skip header
          .filter(row => row[0] || row[1])
          .map((row, idx) => ({
            id: `t-${Date.now()}-${idx}`,
            name: String(row[1] || row[0] || '').trim(),
            roomNo: '',
            isHighlighted: false,
            assignments: {}
          }));
          
        if (newTeachers.length > 0) {
          setTeachers(newTeachers);
          toast.success(`Imported ${newTeachers.length} invigilators`);
        }
      } catch (err) {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsBinaryString(file);
  };

  const addDate = () => {
    const d = new Date();
    setDates([...dates, { id: `d${Date.now()}`, label: 'New Date', shifts: ['H1', 'H2', 'H3', 'H4'] }]);
  };

  const addTeacher = () => {
    setTeachers([...teachers, { id: `t${Date.now()}`, name: '', roomNo: '', isHighlighted: false, assignments: {} }]);
  };

  const toggleHighlight = (id: string) => {
    setTeachers(teachers.map(t => t.id === id ? { ...t, isHighlighted: !t.isHighlighted } : t));
  };

  const updateAssignment = (tId: string, cellKey: string, val: string) => {
    setTeachers(teachers.map(t => {
      if (t.id === tId) {
        return { ...t, assignments: { ...t.assignments, [cellKey]: val } };
      }
      return t;
    }));
  };

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Custom Header Styling
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(institution, pageWidth / 2, 40, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(address, pageWidth / 2, 55, { align: 'center' });
    doc.text(session, pageWidth / 2, 70, { align: 'center' });
    
    // Exam Name and Chart Title
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text(`Examination: ${examName}`, 40, 95);

    doc.setFontSize(14);
    const chartTitle = "Invigilation Duty Chart";
    const titleWidth = doc.getTextWidth(chartTitle);
    doc.text(chartTitle, pageWidth / 2, 115, { align: 'center' });
    doc.line((pageWidth - titleWidth) / 2, 118, (pageWidth + titleWidth) / 2, 118);

    // Table Preparation
    // Two rows of headers: Date Row and Shift Row
    const head1 = [
      { content: 'Sl.', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'Invigilator Name', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'Room No.', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      ...dates.map(d => ({ content: d.label, colSpan: d.shifts.length, styles: { halign: 'center' as const } }))
    ];
    
    const head2 = dates.flatMap(d => d.shifts.map(s => ({ content: s, styles: { halign: 'center' as const } })));

    const body = teachers.map((t, idx) => {
      const rowData: any[] = [idx + 1, t.name, t.roomNo];
      dates.forEach(d => {
        d.shifts.forEach(s => {
          rowData.push(t.assignments[`${d.id}-${s}`] || '');
        });
      });
      return rowData;
    });

    autoTable(doc, {
      startY: 130,
      head: [head1, head2],
      body: body,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: 9,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center' as const },
      },
      didParseCell: (data) => {
        // Red color for highlighted teachers
        if (data.section === 'body' && data.column.index === 1) {
          const tIdx = data.row.index;
          if (teachers[tIdx]?.isHighlighted) {
            data.cell.styles.textColor = [255, 0, 0];
          }
        }
      },
      margin: { left: 40, right: 40 }
    });

    // Side Stats
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.text(`no of room: ${stats.rooms}`, pageWidth - 150, finalY);
    doc.text(`no of inv: ${stats.invigilators}`, pageWidth - 150, finalY + 15);
    doc.text(`no of Group d: ${stats.groupD}`, pageWidth - 150, finalY + 30);

    doc.save('Invigilation_Duty_Chart.pdf');
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-32">
        {/* Top Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                   <CalendarDays className="h-8 w-8 text-white" />
                </div>
                <div>
                   <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Invigilation Chart</h1>
                   <p className="text-slate-500 font-medium">Professional duty roster management system.</p>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <Button variant="outline" onClick={() => { setTeachers([]); setDates([]); }} className="h-12 px-6 rounded-xl border-slate-200">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear All
             </Button>
             <Button onClick={generatePDF} className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 text-white font-bold transition-all hover:scale-105 active:scale-95">
                <Printer className="h-5 w-5 mr-2" />
                Export Official Chart
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* SIDEBAR CONFIG */}
           <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 border-slate-200 shadow-xl rounded-[2rem] bg-white dark:bg-slate-950">
                 <div className="flex items-center gap-2 mb-6">
                    <Settings2 className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-bold">Header Config</h2>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Institution</Label>
                       <Input value={institution} onChange={e => setInstitution(e.target.value)} className="bg-slate-50 border-none font-bold" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Address/Location</Label>
                       <Input value={address} onChange={e => setAddress(e.target.value)} className="bg-slate-50 border-none" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Academic Session</Label>
                       <Input value={session} onChange={e => setSession(e.target.value)} className="bg-slate-50 border-none" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Examination Type</Label>
                       <textarea 
                          value={examName} 
                          onChange={e => setExamName(e.target.value)} 
                          className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                        />
                    </div>
                 </div>
              </Card>

              <Card className="p-6 border-slate-200 shadow-xl rounded-[2rem] bg-white dark:bg-slate-950">
                 <div className="flex items-center gap-2 mb-6">
                    <FileCheck className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-xl font-bold">Summary Stats</h2>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400">No. of Rooms</Label>
                       <Input value={stats.rooms} onChange={e => setStats({...stats, rooms: e.target.value})} className="bg-slate-50 border-none font-mono" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400">Group D Staff</Label>
                       <Input value={stats.groupD} onChange={e => setStats({...stats, groupD: e.target.value})} className="bg-slate-50 border-none font-mono" />
                    </div>
                 </div>
                 <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Total Invigilators (Auto)</p>
                    <p className="text-3xl font-black text-emerald-700">{autoInvCount}</p>
                 </div>
              </Card>
           </div>

           {/* MAIN EDITOR */}
           <div className="lg:col-span-8 flex flex-col gap-6">
              <Card className="flex-1 min-h-[600px] border-slate-200 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950 flex flex-col">
                 <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <div className="flex -space-x-2">
                          <Button variant="outline" size="sm" onClick={addTeacher} className="rounded-full h-10 w-10 p-0 border-blue-200 text-blue-600 hover:bg-blue-50">
                             <Plus size={20} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-full h-10 w-10 p-0 border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                             <Upload size={18} />
                          </Button>
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
                       </div>
                       <Badge variant="secondary" className="bg-white px-3 py-1 font-bold text-[10px] border border-slate-200">{teachers.length} TEACHERS</Badge>
                    </div>

                    <div className="flex items-center gap-2">
                       <Button size="sm" variant="outline" onClick={addDate} className="h-9 px-4 rounded-xl gap-2 font-bold text-xs bg-white">
                          <TableIcon size={14} /> Add Date
                       </Button>
                       <Button size="sm" className="h-9 px-4 rounded-xl gap-2 font-bold text-xs bg-slate-900">
                          <Save size={14} /> Save Draft
                       </Button>
                    </div>
                 </div>

                 <div className="flex-1 overflow-auto bg-slate-50/30">
                    <table className="w-full border-collapse">
                       <thead className="sticky top-0 z-20">
                          <tr className="bg-white dark:bg-slate-950 border-b shadow-sm">
                             <th className="p-4 border-r w-12 text-center text-[10px] font-black text-slate-400">REF</th>
                             <th className="p-4 border-r w-56 text-left text-[10px] font-black text-slate-400">INVIGILATOR NAME</th>
                             <th className="p-4 border-r w-24 text-left text-[10px] font-black text-slate-400">ROOM NO.</th>
                             {dates.map(d => (
                                <th key={d.id} className="p-0 border-r min-w-[120px]" colSpan={d.shifts.length}>
                                   <div className="flex items-center justify-between px-3 py-1 bg-slate-50/80 border-b">
                                      <input 
                                         value={d.label} 
                                         onChange={e => {
                                            const next = [...dates];
                                            const idx = next.findIndex(x => x.id === d.id);
                                            next[idx].label = e.target.value;
                                            setDates(next);
                                         }}
                                         className="bg-transparent text-[10px] font-black text-blue-600 focus:outline-none w-16" 
                                      />
                                      <button onClick={() => setDates(dates.filter(x => x.id !== d.id))} className="text-slate-300 hover:text-red-500 p-1">
                                         <Trash2 size={12} />
                                      </button>
                                   </div>
                                   <div className="grid grid-cols-4 divide-x">
                                      {d.shifts.map(s => <div key={s} className="py-1 text-[9px] font-bold text-slate-400 text-center">{s}</div>)}
                                   </div>
                                </th>
                             ))}
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {teachers.map((t, tIdx) => (
                             <tr key={t.id} className="bg-white hover:bg-blue-50/20 transition-colors group">
                                <td className="p-4 border-r text-center text-xs font-mono text-slate-300 group-hover:text-blue-400">{tIdx + 1}</td>
                                <td className="p-2 border-r relative group/name">
                                   <div className="flex items-center gap-2 px-2">
                                      <input 
                                         type="checkbox" 
                                         checked={t.isHighlighted} 
                                         onChange={() => toggleHighlight(t.id)}
                                         className="h-3 w-3 rounded border-slate-300 accent-red-600"
                                      />
                                      <input 
                                         value={t.name}
                                         onChange={e => {
                                            const next = [...teachers];
                                            next[tIdx].name = e.target.value;
                                            setTeachers(next);
                                         }}
                                         className={`flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold outline-none transition-colors ${t.isHighlighted ? 'text-red-600' : 'text-slate-800'}`}
                                         placeholder="New Teacher Name..."
                                      />
                                   </div>
                                </td>
                                <td className="p-2 border-r">
                                   <input 
                                      value={t.roomNo}
                                      onChange={e => {
                                         const next = [...teachers];
                                         next[tIdx].roomNo = e.target.value;
                                         setTeachers(next);
                                      }}
                                      className="w-full bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none text-center"
                                      placeholder="-"
                                   />
                                </td>
                                {dates.map(d => (
                                   <React.Fragment key={d.id}>
                                      {d.shifts.map(s => (
                                         <td key={s} className="p-1 border-r">
                                            <input 
                                               value={t.assignments[`${d.id}-${s}`] || ''}
                                               onChange={e => updateAssignment(t.id, `${d.id}-${s}`, e.target.value)}
                                               className="w-full h-8 text-center bg-transparent border-none text-sm font-bold text-blue-600 focus:bg-blue-50 focus:outline-none placeholder:text-slate-200"
                                               placeholder="-"
                                            />
                                         </td>
                                      ))}
                                   </React.Fragment>
                                ))}
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </Card>
           </div>
        </div>
      </div>
    </MainLayout>
  );
}
