'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppState } from '@/hooks/use-app-state';
import { CalendarDays, Printer, ArrowLeft, Plus, Trash2 } from 'lucide-react';

type DateColumn = {
  id: string;
  label: string; 
  hasH2: boolean;
};

type InvigilatorRow = {
  id: string;
  name: string;
  // Maps a cell key to a value. Cell key format: "dateId-H1" or "dateId-H2"
  assignments: Record<string, string>;
};

export default function DutyChartPage() {
  const { fetchData } = useAppState();
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [isGenerating, setIsGenerating] = useState(false);

  // Form Headers
  const [institutionName, setInstitutionName] = useState('BPC Institute of Technology, Krishnagar, Nadia');
  const [academicSession, setAcademicSession] = useState('2025-2026');
  const [examinationType, setExaminationType] = useState('Diploma');

  // Dynamic Grid Data
  const [dates, setDates] = useState<DateColumn[]>([
    { id: 'd1', label: '13-Jan', hasH2: true },
    { id: 'd2', label: '14-Jan', hasH2: true },
    { id: 'd3', label: '15-Jan', hasH2: true },
    { id: 'd4', label: '16-Jan', hasH2: true },
    { id: 'd5', label: '17-Jan', hasH2: true },
    { id: 'd6', label: '18-Jan', hasH2: false },
    { id: 'd7', label: '19-Jan', hasH2: false },
    { id: 'd8', label: '20-Jan', hasH2: false },
    { id: 'd9', label: '21-Jan', hasH2: false },
    { id: 'd10', label: '21-Jan', hasH2: false },
  ]);

  const [rows, setRows] = useState<InvigilatorRow[]>([
    { id: 'r1', name: '', assignments: {} },
    { id: 'r2', name: '', assignments: {} },
    { id: 'r3', name: '', assignments: {} },
    { id: 'r4', name: '', assignments: {} },
    { id: 'r5', name: '', assignments: {} },
    { id: 'r6', name: '', assignments: {} },
  ]);

  const addDate = () => {
    setDates([...dates, { id: `d${Date.now()}`, label: 'New', hasH2: true }]);
  };

  const removeDate = (id: string) => {
    setDates(dates.filter(d => d.id !== id));
  };

  const updateDateLabel = (id: string, label: string) => {
    setDates(dates.map(d => d.id === id ? { ...d, label } : d));
  };

  const toggleH2 = (id: string) => {
    setDates(dates.map(d => d.id === id ? { ...d, hasH2: !d.hasH2 } : d));
  };

  const addRow = () => {
    setRows([...rows, { id: `r${Date.now()}`, name: '', assignments: {} }]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRowName = (id: string, name: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, name } : r));
  };

  const updateAssignment = (rowId: string, cellKey: string, value: string) => {
    setRows(rows.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          assignments: {
            ...r.assignments,
            [cellKey]: value
          }
        };
      }
      return r;
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-12 print:bg-white print:pb-0">
         {/* Non-print controls */}
         <div className="max-w-6xl mx-auto pt-8 px-6 print:hidden mb-6 flex justify-between items-center">
             <Button variant="outline" onClick={() => setIsGenerating(false)} className="gap-2 bg-white">
                 <ArrowLeft size={16}/> Back to Editor
             </Button>
             <Button onClick={handlePrint} className="gap-2 bg-slate-800 text-white hover:bg-slate-700">
                 <Printer size={16}/> Print Duty Chart
             </Button>
         </div>

         {/* PRINTABLE A4 LANDSCAPE CONTAINER */}
         {/* Using landscape proportions, max-w-full to allow printing wide */}
         <div className="max-w-[1100px] mx-auto bg-white border border-slate-300 shadow-xl print:shadow-none print:border-none print:w-full print:max-w-none sm:px-12 px-6 py-12 text-black font-sans">
             
             {/* HEADERS */}
             <div className="text-center space-y-4 mb-10">
                 <h1 className="text-xl font-bold">{institutionName}</h1>
                 
                 <div className="text-lg">
                     Academic Session: <span className="text-red-600 font-semibold">{academicSession}</span>
                 </div>
                 
                     <div className="flex justify-between items-center max-w-4xl mx-auto px-12">
                         <div className="text-lg">
                             Examination: <span className="text-red-600 font-semibold">{examinationType}</span>
                         </div>
                         <h2 className="text-xl font-bold uppercase tracking-wider pl-8 text-black">INVIGILATION DUTY CHART</h2>
                         <div className="w-[200px]"></div> {/* spacer for centering Duty Chart title */}
                     </div>
             </div>

             {/* THE GRID TABLE */}
             <table className="w-full border-collapse border border-black text-sm text-center mb-12">
                 <thead>
                     <tr>
                         <th className="border border-black font-normal py-2 w-12" rowSpan={2}>Sl.<br/>No</th>
                         <th className="border border-black font-bold py-2 w-48" rowSpan={2}>Invigilator Name</th>
                         {dates.map((d) => (
                             <th key={d.id} className="border border-black font-normal py-2 text-red-600" colSpan={d.hasH2 ? 2 : 1}>
                                 {d.label}
                             </th>
                         ))}
                     </tr>
                     <tr>
                         {dates.map((d) => (
                             <React.Fragment key={`${d.id}-headers`}>
                                 <td className="border border-black py-1 font-normal text-red-600 w-8">{d.hasH2 ? 'H1' : 'H1'}</td>
                                 {d.hasH2 && <td className="border border-black py-1 font-normal text-red-600 w-8">H2</td>}
                             </React.Fragment>
                         ))}
                     </tr>
                     {/* A Blank Separator Row for visual spacing */}
                     <tr>
                         <td className="border border-black h-5"></td>
                         <td className="border border-black font-semibold py-1 text-center text-sm"></td>
                         {dates.map((d) => (
                             <React.Fragment key={`${d.id}-blank`}>
                                 <td className="border border-black"></td>
                                 {d.hasH2 && <td className="border border-black"></td>}
                             </React.Fragment>
                         ))}
                     </tr>
                 </thead>
                 <tbody>
                     {rows.map((r, rIdx) => (
                         <tr key={r.id}>
                             <td className="border border-black py-2">{rIdx + 1}</td>
                             <td className="border border-black text-center px-3 font-medium text-red-600">
                                {/* Invisible input for quick tweaks before print if needed, but mostly static */}
                                {r.name || '\u00A0'}
                             </td>
                             {dates.map((d) => (
                                 <React.Fragment key={`${d.id}-cells`}>
                                     <td className="border border-black py-2 font-bold text-slate-800 text-center h-[37px]">
                                         {r.assignments[`${d.id}-H1`] || '\u00A0'}
                                     </td>
                                     {d.hasH2 && (
                                         <td className="border border-black py-2 font-bold text-slate-800 text-center h-[37px]">
                                             {r.assignments[`${d.id}-H2`] || '\u00A0'}
                                         </td>
                                     )}
                                 </React.Fragment>
                             ))}
                         </tr>
                     ))}
                 </tbody>
             </table>

             {/* FOOTER MESSAGE */}
             <div className="mt-12 text-center text-[15px] font-medium px-12 leading-relaxed">
                 All the invigilators are requested to report to the Examination Cell at least 30 minutes before the commencement of the examination.
             </div>

         </div>
      </div>
    );
  }

  // EDITOR VIEW
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
          <div>
              <h1 className="text-3xl font-bold flex items-center gap-3"><CalendarDays className="text-primary"/> Duty Chart Generator</h1>
              <p className="text-muted-foreground mt-2">Design an interactive examination invigilator duty roster.</p>
          </div>

          <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">1. Header Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                      <Label>Institution Name</Label>
                      <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Academic Session</Label>
                      <Input value={academicSession} onChange={e => setAcademicSession(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Examination Type</Label>
                      <Input value={examinationType} onChange={e => setExaminationType(e.target.value)} />
                  </div>
              </div>
          </Card>

          <Card className="p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <h2 className="text-xl font-bold">2. Interactive Grid Editor</h2>
                 <Button onClick={addDate} variant="outline" size="sm" className="gap-2">
                     <Plus size={16}/> Add Date Column
                 </Button>
              </div>

              <div className="overflow-x-auto pb-4">
                  <table className="w-full text-sm min-w-[800px]">
                      <thead>
                          <tr>
                              <th className="p-2 border bg-slate-50 w-12 text-center">Ref</th>
                              <th className="p-2 border bg-slate-50 w-48 text-left">Invigilator Name</th>
                              {dates.map((d) => (
                                  <th key={d.id} className="p-2 border bg-slate-50 text-center min-w-[100px]" colSpan={d.hasH2 ? 2 : 1}>
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                          <Input 
                                            value={d.label} 
                                            onChange={(e) => updateDateLabel(d.id, e.target.value)}
                                            className="h-7 text-xs font-bold text-center text-red-600 bg-white px-1"
                                          />
                                          <button onClick={() => removeDate(d.id)} className="text-slate-400 hover:text-red-500 shrink-0">
                                              <Trash2 size={14}/>
                                          </button>
                                      </div>
                                      <div className="flex items-center justify-center gap-1 bg-slate-200/50 p-1 rounded">
                                          <input 
                                              type="checkbox" 
                                              checked={d.hasH2} 
                                              onChange={() => toggleH2(d.id)}
                                              id={`h2-${d.id}`}
                                              className="w-3 h-3 cursor-pointer"
                                          />
                                          <label htmlFor={`h2-${d.id}`} className="text-[10px] uppercase text-slate-500 font-bold cursor-pointer">Has H2</label>
                                      </div>
                                  </th>
                              ))}
                          </tr>
                          <tr>
                              <th className="p-0 border-none bg-slate-50"></th>
                              <th className="p-0 border-none bg-slate-50"></th>
                              {dates.map(d => (
                                  <React.Fragment key={`${d.id}-headers`}>
                                      <th className="p-1 border bg-slate-50 text-xs text-red-500 font-bold text-center w-16">H1</th>
                                      {d.hasH2 && <th className="p-1 border bg-slate-50 text-xs text-red-500 font-bold text-center w-16">H2</th>}
                                  </React.Fragment>
                              ))}
                          </tr>
                      </thead>
                      <tbody>
                          {rows.map((r, rIdx) => (
                              <tr key={r.id}>
                                  <td className="p-2 border text-center text-slate-400 font-bold bg-slate-50/50">
                                      {rIdx + 1}
                                  </td>
                                  <td className="p-2 border relative group bg-white">
                                      <Input 
                                          value={r.name} 
                                          onChange={(e) => updateRowName(r.id, e.target.value)}
                                          placeholder="Enter name..."
                                          className="border-transparent focus:border-input shadow-none h-8 w-full font-medium"
                                      />
                                      <button 
                                          onClick={() => removeRow(r.id)} 
                                          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-2 transition-opacity block"
                                      >
                                          <Trash2 size={14}/>
                                      </button>
                                  </td>
                                  {dates.map((d) => (
                                      <React.Fragment key={d.id}>
                                          <td className="p-1 border text-center align-top bg-white">
                                              <Input 
                                                  value={r.assignments[`${d.id}-H1`] || ''}
                                                  onChange={(e) => updateAssignment(r.id, `${d.id}-H1`, e.target.value)}
                                                  className="h-8 text-center border-slate-200 px-1 placeholder:text-slate-300 font-bold text-slate-700 w-full"
                                                  placeholder="-"
                                              />
                                          </td>
                                          {d.hasH2 && (
                                              <td className="p-1 border text-center align-top bg-white">
                                                  <Input 
                                                      value={r.assignments[`${d.id}-H2`] || ''}
                                                      onChange={(e) => updateAssignment(r.id, `${d.id}-H2`, e.target.value)}
                                                      className="h-8 text-center border-slate-200 px-1 placeholder:text-slate-300 font-bold text-slate-700 w-full"
                                                      placeholder="-"
                                                  />
                                              </td>
                                          )}
                                      </React.Fragment>
                                  ))}
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  
                  <Button onClick={addRow} variant="outline" size="sm" className="mt-4 gap-2 border-dashed w-full text-slate-500">
                     <Plus size={16}/> Add Invigilator Row
                 </Button>
              </div>
          </Card>

          <div className="flex justify-end gap-4 pb-12">
              <Button onClick={() => setIsGenerating(true)} size="lg" className="w-full md:w-auto font-bold bg-primary px-12">
                 Generate Official Duty Chart
              </Button>
          </div>
      </div>
    </MainLayout>
  );
}
