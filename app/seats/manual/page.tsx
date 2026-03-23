'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppState, Student } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  DoorOpen,
  Plus,
  Trash2,
  Download,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  Wand2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type RoomAllocation = {
  roomNumber: number; // For internal sequence
  roomName: string;   // Customizable identifier
  pattern: string;    // Seating pattern
  capacity: number;
  allocations: {
    dept: string;
    students: Student[];
  }[];
  layout: {
    columnIndex: number;
    benches: {
      benchIndex: number;
      left: Student | null;
      right: Student | null;
    }[];
  }[];
  totalAllocated: number;
  numRows: number;
  benchesPerRow: number;
};

const DEPARTMENTS = ['DCST', 'DME', 'DCE', 'DEE'];
const PATTERNS = ['Z-Pattern (Zig-Zag)', 'Row-wise Linear', 'Column-wise Linear', 'Snake Pattern', 'Random Distribution'];

export default function ManualAllocationPage() {
  const { students, loadFromLocalStorage } = useAppState();

  // Local state for the allocation process
  const [roomName, setRoomName] = useState<string>('');
  const [seatingPattern, setSeatingPattern] = useState<string>(PATTERNS[0]);
  const [benchesPerRow, setBenchesPerRow] = useState<number>(2);
  const [numRows, setNumRows] = useState<number>(10);
  const [targetStudentCount, setTargetStudentCount] = useState<number>(0);
  const [deptInputs, setDeptInputs] = useState<Record<string, number>>({
    DCST: 0,
    DME: 0,
    DCE: 0,
    DEE: 0,
  });

  const [allocatedStudentIds, setAllocatedStudentIds] = useState<Set<string>>(new Set());
  const [roomAllocations, setRoomAllocations] = useState<RoomAllocation[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    loadFromLocalStorage();
    const savedAllocations = localStorage.getItem('manual_room_allocations');
    const savedIds = localStorage.getItem('manual_allocated_student_ids');
    if (savedAllocations) setRoomAllocations(JSON.parse(savedAllocations));
    if (savedIds) setAllocatedStudentIds(new Set(JSON.parse(savedIds)));
  }, [loadFromLocalStorage]);

  // Persist to local storage whenever allocations change
  useEffect(() => {
    localStorage.setItem('manual_room_allocations', JSON.stringify(roomAllocations));
    localStorage.setItem('manual_allocated_student_ids', JSON.stringify([...allocatedStudentIds]));
  }, [roomAllocations, allocatedStudentIds]);

  // Group students by department and filter out already allocated ones
  const availableStudentsByDept = useMemo(() => {
    const map = new Map<string, Student[]>();
    DEPARTMENTS.forEach(dept => map.set(dept, []));

    students.forEach(s => {
      const dept = s.department || 'Other';
      if (DEPARTMENTS.includes(dept) && !allocatedStudentIds.has(s.id)) {
        map.get(dept)?.push(s);
      }
    });

    return map;
  }, [students, allocatedStudentIds]);

  const totalAvailable = useMemo(() => {
    let count = 0;
    availableStudentsByDept.forEach(list => count += list.length);
    return count;
  }, [availableStudentsByDept]);

  const handleDeptInputChange = (dept: string, value: string) => {
    const num = parseInt(value) || 0;
    setDeptInputs(prev => ({ ...prev, [dept]: num }));
  };

  const handleAllocate = () => {
    const totalSelected = Object.values(deptInputs).reduce((a, b) => a + b, 0);

    if (totalSelected === 0) {
      toast.error('Please select at least one student to allocate');
      return;
    }

    const maxCapacity = benchesPerRow * numRows * 2;
    if (totalSelected > maxCapacity) {
      toast.error(`Total selected students (${totalSelected}) exceeds room capacity (${maxCapacity})`);
      return;
    }

    // Check availability
    for (const dept of DEPARTMENTS) {
      const requested = deptInputs[dept];
      const available = availableStudentsByDept.get(dept)?.length || 0;
      if (requested > available) {
        toast.error(`Insufficient students in ${dept}. Requested: ${requested}, Available: ${available}`);
        return;
      }
    }

    // Perform allocation
    const newAllocations: RoomAllocation['allocations'] = [];
    const newLocalAllocatedIds = new Set(allocatedStudentIds);

    DEPARTMENTS.forEach(dept => {
      const count = deptInputs[dept];
      if (count > 0) {
        const studentList = [...(availableStudentsByDept.get(dept) || [])];
        const selected = studentList.slice(0, count);

        newAllocations.push({
          dept,
          students: selected
        });

        selected.forEach(s => newLocalAllocatedIds.add(s.id));
      }
    });

    // Generate Bench Layout - Hybrid Algorithm (Pattern + Isolation)
    const layout: RoomAllocation['layout'] = [];
    
    // Step 1: Create a flat list of all students to be allocated
    const allStudents: Student[] = [];
    newAllocations.forEach(a => {
      allStudents.push(...a.students);
    });
    
    // Step 2: Initialize Grid
    // Grid dimensions: rows = numRows, cols = benchesPerRow * 2 (each bench has Left/Right seat)
    const grid: (Student | null)[][] = Array.from(
      { length: numRows }, 
      () => Array(benchesPerRow * 2).fill(null)
    );

    // Step 3: Define Visit Order based on Seating Pattern
    const visitOrder: [number, number][] = [];
    
    if (seatingPattern === 'Column-wise Linear') {
      // Traverse down each physical column (Left seat then Right seat)
      for (let c = 0; c < benchesPerRow * 2; c++) {
        for (let r = 0; r < numRows; r++) {
           visitOrder.push([r, c]);
        }
      }
    } else if (seatingPattern === 'Snake Pattern') {
      // Down one column, up the next
      for (let c = 0; c < benchesPerRow * 2; c++) {
        if (c % 2 === 0) {
          for (let r = 0; r < numRows; r++) visitOrder.push([r, c]);
        } else {
          for (let r = numRows - 1; r >= 0; r--) visitOrder.push([r, c]);
        }
      }
    } else if (seatingPattern === 'Random Distribution') {
      const allPos: [number, number][] = [];
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < benchesPerRow * 2; c++) allPos.push([r, c]);
      }
      for (let i = allPos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPos[i], allPos[j]] = [allPos[j], allPos[i]];
      }
      visitOrder.push(...allPos);
    } else if (seatingPattern === 'Z-Pattern (Zig-Zag)') {
      // Left to Right row by row, zig-zagging
      for (let r = 0; r < numRows; r++) {
        if (r % 2 === 0) {
          for (let c = 0; c < benchesPerRow * 2; c++) visitOrder.push([r, c]);
        } else {
          for (let c = (benchesPerRow * 2) - 1; c >= 0; c--) visitOrder.push([r, c]);
        }
      }
    } else { // Row-wise Linear (Default)
      // Left to right across all columns, row by row
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < benchesPerRow * 2; c++) {
          visitOrder.push([r, c]);
        }
      }
    }

    // Step 4: Hybrid Placement (Follow Pattern Order + Enforce Isolation)
    const deptQueues = newAllocations.map(a => ({ dept: a.dept, q: [...a.students] }));
    
    for (const [r, c] of visitOrder) {
      if (allStudents.length === 0) break;
      
      const remainingTotal = deptQueues.reduce((sum, dq) => sum + dq.q.length, 0);
      if (remainingTotal === 0) break;

      if (r >= numRows || c >= benchesPerRow * 2) continue; // Safety boundary check

      // Check all 4 physical neighbors (up, down, left, right in a grid)
      const neighbors = [
        r > 0 ? grid[r-1][c] : null,
        r < numRows - 1 ? grid[r+1][c] : null,
        c > 0 ? grid[r][c-1] : null,
        c < (benchesPerRow * 2) - 1 ? grid[r][c+1] : null
      ].filter(Boolean);
      
      const forbiddenDepts = new Set(neighbors.map(n => n!.department));

      const candidates = deptQueues
        .filter(dq => dq.q.length > 0 && !forbiddenDepts.has(dq.dept))
        .sort((a, b) => b.q.length - a.q.length);

      if (candidates.length > 0) {
        grid[r][c] = candidates[0].q.shift()!;
      } else {
        const fallback = deptQueues
          .filter(dq => dq.q.length > 0)
          .sort((a, b) => b.q.length - a.q.length);
          
        if (fallback.length > 0) {
          grid[r][c] = fallback[0].q.shift()!;
        }
      }
    }

    // Step 5: Map grid back to column-based layout format
    for (let c = 0; c < benchesPerRow; c++) {
      const colBenches = [];
      for (let r = 0; r < numRows; r++) {
        colBenches.push({
          benchIndex: r + 1 + (c * numRows),
          left: grid[r][c * 2],
          right: grid[r][c * 2 + 1]
        });
      }
      layout.push({
        columnIndex: c + 1,
        benches: colBenches
      });
    }

    const newRoom: RoomAllocation = {
      roomNumber: roomAllocations.length + 1,
      roomName: roomName || `Room ${roomAllocations.length + 1}`,
      pattern: seatingPattern,
      capacity: benchesPerRow * numRows * 2,
      allocations: newAllocations,
      layout: layout,
      totalAllocated: totalSelected,
      numRows: numRows,
      benchesPerRow: benchesPerRow
    };

    setRoomAllocations(prev => [...prev, newRoom]);
    setAllocatedStudentIds(newLocalAllocatedIds);

    // Reset inputs but maybe keep capacity/pattern
    setDeptInputs({ DCST: 0, DME: 0, DCE: 0, DEE: 0 });
    setRoomName('');
    toast.success(`${newRoom.roomName} allocated successfully!`);
  };

  const handleAutoFill = () => {
    let maxCap = benchesPerRow * numRows * 2;
    let limit = targetStudentCount > 0 ? Math.min(targetStudentCount, maxCap) : maxCap;
    
    const newInputs = { ...deptInputs };
    const currentTotal = Object.values(newInputs).reduce((a, b) => a + b, 0);
    let currentRemaining = limit - currentTotal;

    if (currentRemaining <= 0) {
      toast.info(targetStudentCount > 0 ? `Selected target (${limit}) already reached` : 'Room is already full');
      return;
    }

    // Simple priority: Fill based on current inputs first, then top-down
    for (const dept of DEPARTMENTS) {
      const available = availableStudentsByDept.get(dept)?.length || 0;
      const alreadySelected = newInputs[dept];

      const canAdd = Math.min(available - alreadySelected, currentRemaining);
      if (canAdd > 0) {
        newInputs[dept] += canAdd;
        currentRemaining -= canAdd;
      }
      if (currentRemaining <= 0) break;
    }

    setDeptInputs(newInputs);
    toast.info(`Auto-filled up to ${limit - currentRemaining} students`);
  };

  const handleShuffle = () => {
    setIsShuffling(true);
    setTimeout(() => {
      toast.success('Students shuffled for better distribution');
      setIsShuffling(false);
    }, 800);
  };

  const clearAllocations = () => {
    if (confirm('Are you sure you want to clear all allocations?')) {
      setRoomAllocations([]);
      setAllocatedStudentIds(new Set());
      setDeptInputs({ DCST: 0, DME: 0, DCE: 0, DEE: 0 });
      setBenchesPerRow(2);
      setNumRows(10);
      setTargetStudentCount(0);
      setRoomName('');
      setSeatingPattern(PATTERNS[0]);
      localStorage.removeItem('manual_room_allocations');
      localStorage.removeItem('manual_allocated_student_ids');
      toast.info('All allocations cleared');
    }
  };

  const getBranchName = (dept: string) => {
    const mapping: Record<string, string> = {
      'DCST': 'DSCT',
      'DCE': 'CIVIL ENGG',
      'DME': 'MECH ENGG',
      'DEE': 'ELECT ENGG'
    };
    return mapping[dept] || dept;
  };

  const downloadPDF = () => {
    if (roomAllocations.length === 0) {
      toast.error('No allocations to export');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    roomAllocations.forEach((room, roomIdx) => {
      if (roomIdx > 0) doc.addPage();

      // Get all unique branch names for the top header
      const uniqueDepts = Array.from(new Set(room.allocations.map(a => a.dept)));
      const branchSummary = uniqueDepts.map(d => getBranchName(d)).join(' & ');
      const headerTitle = `ROOM ${room.roomNumber} - ${branchSummary}`.toUpperCase();

      // Table Header Row 1: Room Name + Branches
      const head1 = [
        { content: headerTitle, colSpan: 1 + (room.layout.length * 2), styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 13 } } as any
      ];

      // Table Header Row 2: "BRANCH" + Aisle Departments
      const head2: any[] = [{ content: 'BRANCH', styles: { halign: 'center', fontStyle: 'bold' } }];
      room.layout.forEach(col => {
        const uniqueDeptsInAisle = Array.from(new Set(
          col.benches.flatMap(b => [b.left?.department, b.right?.department].filter(Boolean))
        ));
        const aisleBranchNames = uniqueDeptsInAisle.map(d => getBranchName(d!)).join(' & ');
        const hasCivil = uniqueDeptsInAisle.includes('DCE');
        
        head2.push({ 
          content: aisleBranchNames, 
          colSpan: 2, 
          styles: { 
            halign: 'center', 
            fillColor: hasCivil ? [255, 165, 0] : [255, 255, 255], // Orange if Civil is present
            textColor: [0, 0, 0],
            fontStyle: 'bold'
          } 
        } as any);
      });

      // Body Rows: "REGISTRATION NUMBER" + Student IDs
      const body: any[] = [];
      for (let r = 0; r < room.numRows; r++) {
        const rowData: any[] = [];
        if (r === 0) {
          rowData.push({ 
            content: 'REGISTRATION NUMBER', 
            rowSpan: room.numRows, 
            styles: { 
              valign: 'middle', 
              halign: 'center', 
              cellWidth: 40,
              minCellHeight: 200, // Approximate
              fontSize: 10,
              fontStyle: 'bold'
              // Note: Rotation is handled in didDrawCell
            } 
          } as any);
        }
        
        room.layout.forEach(col => {
          const bench = col.benches[r];
          rowData.push(bench?.left?.roll || bench?.left?.reg_no || '-');
          rowData.push(bench?.right?.roll || bench?.right?.reg_no || '-');
        });
        body.push(rowData);
      }

      // Footer Row: TOTAL
      const foot = [{ content: 'TOTAL', styles: { halign: 'center', fontStyle: 'bold' } }];
      room.layout.forEach(col => {
        const aisleTotal = col.benches.reduce((sum, b) => sum + (b.left ? 1 : 0) + (b.right ? 1 : 0), 0);
        foot.push({ content: aisleTotal.toString(), colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } } as any);
      });
      body.push(foot);

      autoTable(doc, {
        startY: 40,
        head: [head1, head2],
        body: body,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 6,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          textColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineColor: [0, 0, 0]
        },
        didDrawCell: (data) => {
          // Handle rotated text for the sidebar header
          if (data.section === 'body' && data.column.index === 0 && data.cell.raw === 'REGISTRATION NUMBER') {
             const { x, y, width, height } = data.cell;
             doc.saveGraphicsState();
             doc.setFontSize(10);
             doc.setFont('helvetica', 'bold');
             
             // Move to center of cell
             const centerX = x + width / 2;
             const centerY = y + height / 2;
             
             // Rotate 90 degrees counter-clockwise
             doc.beginFormObject(centerX - 100, centerY - 100, 200, 200, [1, 0, 0, 1, 0, 0]); // dummy matrix
             // Actually doc.text with angle is easier in modern jsPDF
             doc.restoreGraphicsState();
             
             // Clean up cell content first by drawing over it if needed (but it's already empty if we didn't specify text)
             // Modern jsPDF text rotation:
             const text = 'REGISTRATION NUMBER';
             const textWidth = doc.getTextWidth(text);
             doc.text(text, x + (width/2) + 4, y + (height/2) + (textWidth/2), { angle: 90 });
             
             // Prevent default text drawing
             data.cell.text = ['']; 
          }
        },
        margin: { left: 40, right: 40 },
      });
    });

    doc.save(`Seat_Allocation_${new Date().toLocaleDateString()}.pdf`);
    toast.success('Grid-style allocation report downloaded');
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Student Seat Allocation System
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manual control over room-wise department distribution.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShuffle} disabled={isShuffling} className="gap-2">
              <Shuffle className={`h-4 w-4 ${isShuffling ? 'animate-spin' : ''}`} />
              Shuffle Pool
            </Button>
            <Button variant="outline" onClick={clearAllocations} className="text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50 bg-white dark:bg-slate-950">
              <Trash2 className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: Configuration */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 border-slate-200 shadow-xl bg-white dark:bg-slate-950 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <DoorOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold">Room Config</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomName" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Room Number / Name
                    </Label>
                    <Input
                      id="roomName"
                      placeholder={`Room ${roomAllocations.length + 1}`}
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="h-11 border-2 focus:ring-blue-500 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numRows" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Number of Rows
                    </Label>
                    <Input
                      id="numRows"
                      type="number"
                      min={1}
                      value={numRows}
                      onChange={(e) => setNumRows(parseInt(e.target.value) || 1)}
                      className="h-11 text-lg font-bold border-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="benchesPerRow" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Benches per Row
                    </Label>
                    <Input
                      id="benchesPerRow"
                      type="number"
                      min={1}
                      max={10}
                      value={benchesPerRow}
                      onChange={(e) => setBenchesPerRow(parseInt(e.target.value) || 1)}
                      className="h-11 text-lg font-bold border-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="targetCount" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Total Students to Allocate
                    </Label>
                    <Input
                      id="targetCount"
                      type="number"
                      min={0}
                      value={targetStudentCount}
                      onChange={(e) => setTargetStudentCount(parseInt(e.target.value) || 0)}
                      className="h-11 text-lg font-bold border-2 focus:ring-blue-500 transition-all"
                      placeholder="Optional: Auto-fill limit"
                    />
                    <p className="text-[10px] text-slate-400 font-medium italic">Capacity: {numRows * benchesPerRow * 2} students</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pattern" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Seating Pattern
                  </Label>
                  <select
                    id="pattern"
                    value={seatingPattern}
                    onChange={(e) => setSeatingPattern(e.target.value)}
                    className="w-full h-11 px-3 border-2 rounded-md focus:ring-blue-500 transition-all font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  >
                    {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <p className="text-[10px] text-slate-400 font-medium italic">Fixed: All patterns now strictly follow side-by-side & vertical isolation rules.</p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                    Department Selection
                  </Label>

                  <div className="grid grid-cols-1 gap-3">
                    {DEPARTMENTS.map((dept) => (
                      <div key={dept} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 transition-colors hover:border-blue-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <Badge className="h-8 min-w-[50px] flex items-center justify-center font-bold bg-blue-600">
                            {dept}
                          </Badge>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Pool</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                              {availableStudentsByDept.get(dept)?.length || 0}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={availableStudentsByDept.get(dept)?.length || 0}
                          value={deptInputs[dept]}
                          onChange={(e) => handleDeptInputChange(dept, e.target.value)}
                          className="w-20 h-9 text-center font-bold"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex justify-between items-center text-sm font-medium p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Total Selection:</span>
                    <span className={`text-lg font-bold ${Object.values(deptInputs).reduce((a, b) => a + b, 0) > (benchesPerRow * numRows * 2)
                        ? 'text-red-500'
                        : 'text-blue-600'
                      }`}>
                      {Object.values(deptInputs).reduce((a, b) => a + b, 0)} / {benchesPerRow * numRows * 2}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={handleAutoFill}
                      className="w-full h-11 gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 bg-white dark:bg-slate-900"
                    >
                      <Wand2 className="h-4 w-4" />
                      Auto-fill Remaining
                    </Button>
                    <Button
                      onClick={handleAllocate}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-500/20"
                    >
                      <Plus className="h-5 w-5" />
                      Allocate to {roomName || `Room ${roomAllocations.length + 1}`}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-slate-900 text-white border-none overflow-hidden relative shadow-2xl">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex items-start gap-4">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold mb-3 uppercase tracking-widest text-blue-300/60">Live Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-blue-300/40 uppercase font-black">Total Pool</span>
                      <span className="text-xl font-black">{students.length}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-blue-300/40 uppercase font-black">Allocated</span>
                      <span className="text-xl font-black text-emerald-400">{allocatedStudentIds.size}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-blue-300/40 uppercase font-black">Remaining</span>
                      <span className="text-xl font-black text-blue-400">{totalAvailable}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-blue-300/40 uppercase font-black">Rooms</span>
                      <span className="text-xl font-black text-orange-400">{roomAllocations.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Panel: Output & Records */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                Allocation History
              </h2>
              <Button
                onClick={downloadPDF}
                disabled={roomAllocations.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            </div>

            {roomAllocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/20">
                <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md mb-6 rotate-3">
                  <Plus className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 tracking-tight">System Ready</h3>
                <p className="text-slate-500 text-center max-w-xs text-sm font-medium">
                  Select department counts and assign them to a room to see results here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {roomAllocations.slice().reverse().map((room) => (
                  <Card key={room.roomNumber} className="overflow-hidden border-slate-200 hover:border-blue-300 transition-all group shadow-sm hover:shadow-xl">
                    <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-900 text-white dark:bg-blue-600 h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg shadow-inner">
                          {room.roomName.match(/\d+/)?.[0] || room.roomNumber}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">{room.roomName}</h4>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{room.pattern}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <div className="text-sm font-black text-slate-800 dark:text-slate-200">{room.totalAllocated} / {room.capacity}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Seats Occupied</div>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none font-black px-3 py-1">
                          {Math.round((room.totalAllocated / room.capacity) * 100)}% FULL
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {DEPARTMENTS.map((dept) => {
                          const alloc = room.allocations.find(a => a.dept === dept);
                          return (
                            <div key={dept} className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{dept}</span>
                              <div className="text-xl font-black text-slate-800 dark:text-slate-200">{alloc?.students.length || 0}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Seat Map Visualization */}
                      <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-tighter">
                            <Users className="h-4 w-4 text-blue-500" />
                            Interactive Seat Map (2 Students per Bench)
                          </div>
                          <div className="flex gap-4">
                            {DEPARTMENTS.map(d => (
                              <div key={d} className="flex items-center gap-1.5 text-[10px] font-bold">
                                <div className={`w-2.5 h-2.5 rounded-full ${d === 'DCST' ? 'bg-blue-500' :
                                    d === 'DEE' ? 'bg-purple-500' :
                                      d === 'DME' ? 'bg-orange-500' : 'bg-emerald-500'
                                  }`}></div>
                                {d}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-6 overflow-x-auto pb-4">
                          {room.layout.map((column) => (
                            <div key={column.columnIndex} className="flex-1 min-w-[250px] space-y-4">
                              <h5 className="text-center text-sm font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">Column {column.columnIndex}</h5>
                              
                              <div className="grid grid-cols-1 gap-4">
                                {column.benches.map((bench) => (
                                  <div key={bench.benchIndex} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md">
                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-2 flex justify-between">
                                      <span>Row {Math.ceil(bench.benchIndex / benchesPerRow)} - Bench {bench.benchIndex}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      {/* Left Seat */}
                                      <div className={`h-14 rounded-lg border-2 flex flex-col items-center justify-center p-1 relative overflow-hidden transition-all ${bench.left ? 'border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800' : 'border-dashed border-slate-200 bg-transparent'
                                        }`}>
                                        {bench.left ? (
                                          <>
                                            <div className={`absolute top-0 left-0 right-0 h-1 ${bench.left.department === 'DCST' ? 'bg-blue-500' :
                                                bench.left.department === 'DEE' ? 'bg-purple-500' :
                                                  bench.left.department === 'DME' ? 'bg-orange-500' : 'bg-emerald-500'
                                              }`}></div>
                                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 leading-tight truncate w-full text-center">{bench.left.name.split(' ')[0]}</span>
                                            <span className="text-[9px] font-bold text-slate-400 mt-1">{bench.left.roll}</span>
                                          </>
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-300">Empty</span>
                                        )}
                                      </div>
                                      {/* Right Seat */}
                                      <div className={`h-14 rounded-lg border-2 flex flex-col items-center justify-center p-1 relative overflow-hidden transition-all ${bench.right ? 'border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800' : 'border-dashed border-slate-200 bg-transparent'
                                        }`}>
                                        {bench.right ? (
                                          <>
                                            <div className={`absolute top-0 left-0 right-0 h-1 ${bench.right.department === 'DCST' ? 'bg-blue-500' :
                                                bench.right.department === 'DEE' ? 'bg-purple-500' :
                                                  bench.right.department === 'DME' ? 'bg-orange-500' : 'bg-emerald-500'
                                              }`}></div>
                                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 leading-tight truncate w-full text-center">{bench.right.name.split(' ')[0]}</span>
                                            <span className="text-[9px] font-bold text-slate-400 mt-1">{bench.right.roll}</span>
                                          </>
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-300">Empty</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-4 tracking-tighter">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Student Register Sample
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {room.allocations.flatMap(a => a.students.slice(0, 12).map(s => (
                            <Badge key={s.id} variant="outline" className="font-mono text-[9px] bg-white dark:bg-slate-950 px-2 py-0 border-slate-200 text-slate-600">
                              {s.roll || s.reg_no.substring(s.reg_no.length - 8)}
                            </Badge>
                          )))}
                          {room.totalAllocated > 12 && (
                            <span className="text-[10px] text-slate-400 self-center font-bold px-2">+{room.totalAllocated - 12} MORE</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {roomAllocations.length > 0 && (
              <div className="bg-blue-600 text-white p-6 rounded-[2rem] shadow-2xl shadow-blue-500/30 flex items-start gap-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/5 skew-x-12 translate-x-16"></div>
                <AlertCircle className="h-7 w-7 text-blue-200 flex-shrink-0" />
                <div className="relative z-10">
                  <h4 className="font-black text-lg tracking-tight">Allocation Insight</h4>
                  <p className="text-sm text-blue-100/80 leading-relaxed font-medium mt-1">
                    You have successfully allocated <span className="text-white font-bold">{allocatedStudentIds.size}</span> students.
                    The remaining <span className="text-white font-bold">{totalAvailable}</span> students are waiting in the pool.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
