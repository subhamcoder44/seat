'use client';

import { useState, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Printer, 
  Trash2, 
  Info,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Search,
  FileStack
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface AttendanceRow {
  slNo: number;
  name: string;
  regNo: string;
  roll: string;
  number: string | number;
  status: string;
  department: string;
}

export default function AttendanceSheetPage() {
  const [data, setData] = useState<AttendanceRow[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [config, setConfig] = useState({
    college: 'BPC INSTITUTE OF TECHNOLOGY (BPC)',
    branch: 'CE',
    title: 'ATTENDANCE SHEET',
    semester: '5th'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get unique departments/branches with counts
  const departmentStats = useMemo(() => {
    const stats: Record<string, number> = {};
    data.forEach(r => {
      const d = r.department || 'Unknown';
      stats[d] = (stats[d] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedBranch !== 'all') {
      result = result.filter(r => (r.department || 'Unknown') === selectedBranch);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(lower) || 
        r.regNo.toLowerCase().includes(lower) ||
        r.roll.toLowerCase().includes(lower) ||
        (r.department && r.department.toLowerCase().includes(lower))
      );
    }
    return result;
  }, [data, searchTerm, selectedBranch]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (jsonData.length === 0) return;

        let headerIdx = 0;
        let colMap = { name: 1, reg: 2, roll: 3, num: 4, status: 5, dept: -1 };

        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i].map(c => String(c || '').toLowerCase());
          if (row.some(c => c.includes('name') || c.includes('student'))) {
            headerIdx = i;
            colMap.name = row.findIndex(c => c.includes('name') || c.includes('student'));
            colMap.reg = row.findIndex(c => c.includes('reg'));
            colMap.roll = row.findIndex(c => c.includes('roll'));
            colMap.num = row.findIndex(c => c.includes('number') || c.includes('no'));
            colMap.status = row.findIndex(c => c.includes('status') || c.includes('type'));
            colMap.dept = row.findIndex(c => c.includes('dept') || c.includes('branch'));
            break;
          }
        }
        
        const mappedData: AttendanceRow[] = jsonData
          .slice(headerIdx + 1)
          .filter(row => row.length > 0 && row[colMap.name !== -1 ? colMap.name : 1] !== undefined)
          .map((row, index) => {
            return {
              slNo: index + 1,
              name: String(row[colMap.name] || '').toUpperCase(),
              regNo: String(row[colMap.reg] || ''),
              roll: String(row[colMap.roll] || ''),
              number: String(row[colMap.num] || ''),
              status: String(row[colMap.status] || 'Regular'),
              department: colMap.dept !== -1 ? String(row[colMap.dept] || '') : ''
            };
          });
          
        setData(mappedData);
        setSelectedBranch('all');
        toast.success(`Successfully parsed ${mappedData.length} students`);
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse file. Ensure it is a valid CSV or Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const generatePDF = (mode: 'single' | 'all' = 'single') => {
    if (data.length === 0) {
      toast.error('No data to generate sheet');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    
    const branchesToProcess = mode === 'all' 
      ? departmentStats.map(s => s[0]) 
      : [selectedBranch !== 'all' ? selectedBranch : config.branch];

    branchesToProcess.forEach((branchName, bIdx) => {
      if (bIdx > 0) doc.addPage();
      
      const branchData = mode === 'all' 
        ? data.filter(r => (r.department || 'Unknown') === branchName)
        : filteredData;

      if (branchData.length === 0) return;

      // Title
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      const titleWidth = doc.getTextWidth(config.title);
      doc.text(config.title, (pageWidth - titleWidth) / 2, 40);
      doc.setLineWidth(0.5);
      doc.line((pageWidth - titleWidth) / 2, 42, (pageWidth + titleWidth) / 2, 42);

      // College Header Box
      doc.setFontSize(14);
      const collegeWidth = doc.getTextWidth(config.college);
      const boxPadding = 12;
      const boxX = (pageWidth - (collegeWidth + boxPadding * 3)) / 2;
      const boxY = 52;
      const boxW = collegeWidth + boxPadding * 3;
      const boxH = 28;
      doc.rect(boxX, boxY, boxW, boxH);
      doc.rect(boxX + 1.5, boxY + 1.5, boxW - 3, boxH - 3);
      doc.text(config.college, pageWidth / 2, boxY + 20, { align: 'center' });

      // Branch Name Box
      doc.setFontSize(10);
      const branchText = `Name of the Branch: ${branchName}`;
      const branchBoxW = 200;
      const branchBoxX = pageWidth - branchBoxW - 40;
      doc.rect(branchBoxX, 85, branchBoxW, 25);
      doc.text(branchText, branchBoxX + 10, 101);

      // Table
      const tableRows = branchData.map((row, index) => [
        index + 1,
        row.name,
        row.regNo,
        row.roll,
        row.number,
        row.status,
        '' 
      ]);

      autoTable(doc, {
        startY: 125,
        head: [[
          { content: 'Sl.\nNo.', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Name of the Student', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Registration\nNumber', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Roll', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Number', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Status\n(Regular\n/ Casual)', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Signature of the Student', styles: { halign: 'center', valign: 'middle' } }
        ]],
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 8.5,
          font: 'times',
          textColor: 0,
          lineColor: 0,
          lineWidth: 0.5,
          cellPadding: 4,
          minCellHeight: 25
        },
        headStyles: {
          fillColor: 255,
          textColor: 0,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.5
        },
        columnStyles: {
          0: { cellWidth: 30, halign: 'center' },
          1: { cellWidth: 140 },
          2: { cellWidth: 90, halign: 'center' },
          3: { cellWidth: 60, halign: 'center' },
          4: { cellWidth: 50, halign: 'center' },
          5: { cellWidth: 50, halign: 'center' },
          6: { cellWidth: 100 }
        },
        margin: { left: 40, right: 40 },
      });
    });

    const fileName = mode === 'all' ? `All_Attendance_Sheets.pdf` : `Attendance_${selectedBranch !== 'all' ? selectedBranch : config.branch}.pdf`;
    doc.save(fileName);
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <ClipboardList className="h-10 w-10 text-blue-600" />
              Attendance Sheet Generator
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
              Generate separate attendance sheets for each branch automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setData([])} disabled={data.length === 0} className="gap-2 border-slate-200">
              <RefreshCw className="h-4 w-4" />
              Reset All
            </Button>
            <Button 
              onClick={() => generatePDF('all')} 
              disabled={data.length === 0}
              variant="secondary"
              className="gap-2 border-blue-200"
            >
              <FileStack className="h-5 w-5" />
              Download All
            </Button>
            <Button 
              onClick={() => generatePDF('single')} 
              disabled={filteredData.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 shadow-lg shadow-blue-500/25 transition-all"
            >
              <Printer className="h-5 w-5" />
              Download Current
            </Button>
          </div>
        </div>

        {/* Branch Cards View */}
        {data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button 
              onClick={() => setSelectedBranch('all')}
              className={`p-4 rounded-2xl border transition-all text-left group ${
                selectedBranch === 'all' 
                ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20' 
                : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-500 transition-colors">Total Students</p>
              <h4 className="text-2xl font-bold mt-1">{data.length}</h4>
              <Badge variant="outline" className="mt-2 text-[9px] uppercase">All Branches</Badge>
            </button>
            {departmentStats.map(([dept, count]) => (
              <button 
                key={dept} 
                onClick={() => setSelectedBranch(dept)}
                className={`p-4 rounded-2xl border transition-all text-left group ${
                  selectedBranch === dept 
                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20' 
                  : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-500 transition-colors">Students in {dept}</p>
                <h4 className="text-2xl font-bold mt-1">{count}</h4>
                <Badge variant="outline" className="mt-2 text-[9px] uppercase">Active Sheet</Badge>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 border-slate-200 shadow-xl bg-white dark:bg-slate-950 dark:border-slate-800">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Page Configuration
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Institution Header</Label>
                  <Input value={config.college} onChange={e => setConfig({...config, college: e.target.value})} className="bg-slate-50/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Manual Branch Override</Label>
                  <Input value={config.branch} onChange={e => setConfig({...config, branch: e.target.value})} className="bg-slate-50/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Semester</Label>
                    <Input value={config.semester} onChange={e => setConfig({...config, semester: e.target.value})} className="bg-slate-50/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Report Title</Label>
                    <Input value={config.title} onChange={e => setConfig({...config, title: e.target.value})} className="bg-slate-50/50" />
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white">
                 <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Printing Tip</p>
                 <p className="text-sm leading-relaxed text-slate-300">
                    When using <strong>Download All</strong>, each branch will automatically start on its own separate page with its specific header info.
                 </p>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            {data.length === 0 ? (
              <Card 
                className={`flex-1 min-h-[500px] border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all ${
                  isDragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white dark:bg-slate-950'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) processFile(file); }}
              >
                <div className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-6 relative">
                  <Upload className="h-12 w-12 text-blue-600" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2">Upload Data Sheet</h3>
                <p className="text-slate-500 mb-8 max-w-sm text-center font-medium">Drag & drop your CSV or Excel file here. The system will auto-separate students by their Branch.</p>
                <Button onClick={() => fileInputRef.current?.click()} className="rounded-2xl px-12 h-14 bg-slate-900 text-lg shadow-xl hover:scale-105 transition-transform">Browse Files</Button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx,.xls" className="hidden" />
              </Card>
            ) : (
              <Card className="flex-1 flex flex-col border-slate-200 shadow-2xl rounded-[2rem] overflow-hidden bg-white dark:bg-slate-950">
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Badge className="bg-blue-600 px-4 py-1.5 font-bold text-xs ring-4 ring-blue-500/10">
                      {selectedBranch === 'all' ? 'FULL POOL' : selectedBranch.toUpperCase()}
                    </Badge>
                    <div className="h-4 w-px bg-slate-200" />
                    <span className="text-sm font-bold text-slate-500">{filteredData.length} STUDENTS FOUND</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search students..." 
                      className="h-10 w-64 pl-12 text-sm rounded-xl border-slate-200 shadow-sm" 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-auto max-h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white/80 backdrop-blur-md dark:bg-slate-950/80 font-bold text-[10px] text-slate-400 uppercase border-b z-20">
                      <tr>
                        <th className="p-6 text-left">Sl. No.</th>
                        <th className="p-6 text-left">Student Name</th>
                        <th className="p-6 text-left">Reg No.</th>
                        <th className="p-6 text-left">Branch</th>
                        <th className="p-6 text-left">Roll No.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors group">
                          <td className="p-6 text-slate-300 font-mono text-xs">{idx + 1}</td>
                          <td className="p-6">
                             <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{row.name}</p>
                             <p className="text-[10px] text-slate-400 font-bold">{row.status}</p>
                          </td>
                          <td className="p-6 font-medium text-slate-600">{row.regNo}</td>
                          <td className="p-6">
                             <Badge variant="secondary" className="bg-slate-100 text-[10px] font-black">{row.department || 'N/A'}</Badge>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                               <input 
                                value={row.roll}
                                onChange={(e) => {
                                  const next = [...data];
                                  const indexInMain = data.findIndex(item => item.slNo === row.slNo);
                                  next[indexInMain].roll = e.target.value;
                                  setData(next);
                                }}
                                className="bg-white border rounded px-2 py-1 text-xs font-bold w-24 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                              <span className="text-slate-300">/</span>
                              <input 
                                value={row.number}
                                onChange={(e) => {
                                  const next = [...data];
                                  const indexInMain = data.findIndex(item => item.slNo === row.slNo);
                                  next[indexInMain].number = e.target.value;
                                  setData(next);
                                }}
                                className="bg-white border rounded px-2 py-1 text-xs font-bold w-16 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}



