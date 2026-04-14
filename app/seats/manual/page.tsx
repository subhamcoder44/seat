'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAppState, Student } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  FileText,
  Sparkles
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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

const PATTERNS = ['Z-Pattern (Zig-Zag)', 'Row-wise Linear', 'Column-wise Linear', 'Snake Pattern', 'Random Distribution'];

export default function ManualAllocationPage() {
  const { students, globalFilters, fetchData, resetFilters } = useAppState();

 
  const [DEPARTMENTS, setDEPARTMENTS] = useState<string[]>([]);


  const [roomName, setRoomName] = useState<string>('');
  const [seatingPattern, setSeatingPattern] = useState<string>(PATTERNS[0]);
  const [benchesPerRow, setBenchesPerRow] = useState<number>(2);
  const [numRows, setNumRows] = useState<number>(10);
  const [targetStudentCount, setTargetStudentCount] = useState<number>(0);
  const [deptInputs, setDeptInputs] = useState<Record<string, number>>({});

  const [allocatedStudentIds, setAllocatedStudentIds] = useState<Set<string>>(new Set());
  const [roomAllocations, setRoomAllocations] = useState<RoomAllocation[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [smartDistribute, setSmartDistribute] = useState(true);
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);

  // Always-fresh ref so downloadPDF never captures a stale closure
  const roomAllocationsRef = useRef<RoomAllocation[]>([]);
  // Stable room counter: never resets even across state batches
  const roomCounterRef = useRef<number>(0);

  useEffect(() => {
    // Fetch students from DB
    fetchData();

    // Restore saved allocations from localStorage
    const savedAllocations = localStorage.getItem('manual_room_allocations');
    const savedIds = localStorage.getItem('manual_allocated_student_ids');
    if (savedAllocations) {
      const parsed: RoomAllocation[] = JSON.parse(savedAllocations);
      setRoomAllocations(parsed);
      // Restore room counter so next allocation continues from the right number
      roomCounterRef.current = parsed.length;
    }
    if (savedIds) setAllocatedStudentIds(new Set(JSON.parse(savedIds)));

    // Fetch distinct departments from DB
    fetch('/api/students?departments=true')
      .then(r => r.json())
      .then((depts: string[]) => {
        const filtered = depts.filter(Boolean).sort();
        setDEPARTMENTS(filtered);
        setDeptInputs(Object.fromEntries(filtered.map(d => [d, 0])));
      })
      .catch(() => {})
      .finally(() => setIsLoadingDepts(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the ref in sync with state on every render (no dependency array needed)
  roomAllocationsRef.current = roomAllocations;

  // Persist to local storage whenever allocations change
  useEffect(() => {
    localStorage.setItem('manual_room_allocations', JSON.stringify(roomAllocations));
    localStorage.setItem('manual_allocated_student_ids', JSON.stringify([...allocatedStudentIds]));
    // Keep room counter in sync with persisted allocations
    if (roomAllocations.length > roomCounterRef.current) {
      roomCounterRef.current = roomAllocations.length;
    }
  }, [roomAllocations, allocatedStudentIds]);

  // Group students by department and filter out already allocated ones, respecting semester filter
  const availableStudentsByDept = useMemo(() => {
    const map = new Map<string, Student[]>();
    DEPARTMENTS.forEach(dept => map.set(dept, []));

    students.forEach(s => {
      const dept = (s as any).department || '';
      const matchesSem = globalFilters.semester.includes('all') || globalFilters.semester.length === 0 || globalFilters.semester.includes(s.sem);
      const matchesCollege = globalFilters.college === 'all' || s.inst_name === globalFilters.college;
      const matchesDept = globalFilters.department === 'all' || s.department === globalFilters.department;
      const matchesType = globalFilters.type === 'all' || s.type === globalFilters.type;

      if (dept && DEPARTMENTS.includes(dept) && !allocatedStudentIds.has(s.id) && matchesSem && matchesCollege && matchesDept && matchesType) {
        if (!map.has(dept)) map.set(dept, []);
        map.get(dept)?.push(s);
      }
    });

    return map;
  }, [students, allocatedStudentIds, DEPARTMENTS, globalFilters]);

  const availableSemesters = useMemo(() => {
    const sems = new Set(students.map(s => s.sem).filter(Boolean));
    return Array.from(sems).sort();
  }, [students]);

  const availableColleges = useMemo(() => {
    const colleges = new Set(students.map(s => s.inst_name).filter(Boolean));
    return Array.from(colleges).sort();
  }, [students]);

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
    let allStudents: Student[] = [];
    
    if (smartDistribute) {
      // Group by semester
      const semMap = new Map<string, Student[]>();
      newAllocations.forEach(a => {
        a.students.forEach(s => {
          if (!semMap.has(s.sem)) semMap.set(s.sem, []);
          semMap.get(s.sem)?.push(s);
        });
      });

      const sems = Array.from(semMap.keys()).sort();
      const maxSize = Math.max(...Array.from(semMap.values()).map(v => v.length));
      
      // Interleave
      for (let i = 0; i < maxSize; i++) {
        sems.forEach(sem => {
          const list = semMap.get(sem);
          if (list && list[i]) {
            allStudents.push(list[i]);
          }
        });
      }
    } else {
      newAllocations.forEach(a => {
        allStudents.push(...a.students);
      });
    }
    
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

    // Use the stable ref counter (never stale, never batched)
    const capturedRoomName = roomName; // capture before reset
    roomCounterRef.current += 1;
    const nextNumber = roomCounterRef.current;
    const assignedRoomName = capturedRoomName || `Room ${nextNumber}`;

    const newRoom: RoomAllocation = {
      roomNumber: nextNumber,
      roomName: assignedRoomName,
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

    // Reset inputs but keep capacity/pattern
    setDeptInputs(Object.fromEntries(DEPARTMENTS.map(d => [d, 0])));
    setRoomName('');
    toast.success(`${assignedRoomName} allocated successfully!`);
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
    setRoomAllocations([]);
    setAllocatedStudentIds(new Set());
    setDeptInputs(Object.fromEntries(DEPARTMENTS.map(d => [d, 0])));
    setBenchesPerRow(2);
    setNumRows(10);
    setTargetStudentCount(0);
    setRoomName('');
    setSeatingPattern(PATTERNS[0]);
    // Reset the stable counter so next allocation starts at Room 1 again
    roomCounterRef.current = 0;
    localStorage.removeItem('manual_room_allocations');
    localStorage.removeItem('manual_allocated_student_ids');
    resetFilters();
    toast.info('All allocations cleared');
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

  // Color palette for departments in PDF (RGB arrays)
  const DEPT_PDF_COLORS: Record<string, [number, number, number]> = {
    'DCST': [173, 216, 230],  // Light Blue
    'DCE':  [255, 200, 120],  // Orange
    'DME':  [255, 182, 193],  // Light Pink/Red
    'DEE':  [216, 191, 216],  // Light Purple
  };
  const DEPT_PDF_COLORS_DEFAULT: [number, number, number] = [198, 239, 206]; // Light Green for others

  const getDeptColor = (dept: string): [number, number, number] => {
    return DEPT_PDF_COLORS[dept] ?? DEPT_PDF_COLORS_DEFAULT;
  };

  const downloadPDF = (specificRoom?: RoomAllocation) => {
    // If specificRoom is provided, only export that one. 
    // Otherwise, always read from the ref to avoid stale closures.
    const latestAllocations = specificRoom ? [specificRoom] : roomAllocationsRef.current;
    
    if (latestAllocations.length === 0) {
      toast.error('No allocations to export');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    latestAllocations.forEach((room, roomIdx) => {
      if (roomIdx > 0) doc.addPage();

      const pageWidth = doc.internal.pageSize.getWidth();

      // ── Top banner: Room name/number ──────────────────────────────────────
      const bannerH = 28;
      doc.setFillColor(30, 30, 80);                        // dark navy
      doc.rect(0, 0, pageWidth, bannerH, 'F');

      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`ROOM : ${room.roomName.toUpperCase()}`, pageWidth / 2, 19, { align: 'center' });

      // Reset text color for the rest
      doc.setTextColor(0, 0, 0);
      // ─────────────────────────────────────────────────────────────────────

      // Get all unique branch names for the top header
      const uniqueDepts = Array.from(new Set(room.allocations.map(a => a.dept)));
      const branchSummary = uniqueDepts.map(d => getBranchName(d)).join(' & ');
      // FIX: Use room.roomName (user-defined) instead of room.roomNumber (sequential index)
      const headerTitle = `${room.roomName.toUpperCase()} - ${branchSummary.toUpperCase()}`;

      // Table Header Row 1: Room Name + Branches
      const head1 = [
        { content: headerTitle, colSpan: 1 + (room.layout.length * 2), styles: { halign: 'center', fillColor: [30, 30, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 13 } } as any
      ];

      // Table Header Row 2: "BRANCH" + Aisle Departments with per-dept color
      const head2: any[] = [{ content: 'BRANCH', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0,0,0] } }];
      room.layout.forEach(col => {
        const uniqueDeptsInAisle = Array.from(new Set(
          col.benches.flatMap(b => [b.left?.department, b.right?.department].filter(Boolean) as string[])
        ));
        const aisleBranchNames = uniqueDeptsInAisle.map(d => getBranchName(d)).join(' & ');

        // Pick color: if single dept use its color, else blend to light gray
        let fillColor: [number, number, number];
        if (uniqueDeptsInAisle.length === 1) {
          fillColor = getDeptColor(uniqueDeptsInAisle[0]);
        } else {
          fillColor = [220, 220, 220]; // mixed aisle = gray
        }

        head2.push({ 
          content: aisleBranchNames, 
          colSpan: 2, 
          styles: { 
            halign: 'center', 
            fillColor,
            textColor: [0, 0, 0],
            fontStyle: 'bold'
          } 
        } as any);
      });

      // Body Rows: "REGISTRATION NUMBER" + Student IDs with per-cell dept color
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
              minCellHeight: 200,
              fontSize: 10,
              fontStyle: 'bold',
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0]
            } 
          } as any);
        }
        
        room.layout.forEach(col => {
          const bench = col.benches[r];
          const leftStudent = bench?.left;
          const rightStudent = bench?.right;
          const leftVal = (leftStudent?.reg_no?.trim() || leftStudent?.roll?.trim() || leftStudent?.name?.trim() || '-');
          const rightVal = (rightStudent?.reg_no?.trim() || rightStudent?.roll?.trim() || rightStudent?.name?.trim() || '-');

          // Color cell background based on department
          if (leftStudent) {
            rowData.push({
              content: leftVal,
              styles: {
                fillColor: getDeptColor(leftStudent.department),
                textColor: [0, 0, 0],
                halign: 'center'
              }
            } as any);
          } else {
            rowData.push({ content: '-', styles: { halign: 'center', textColor: [180, 180, 180] } } as any);
          }

          if (rightStudent) {
            rowData.push({
              content: rightVal,
              styles: {
                fillColor: getDeptColor(rightStudent.department),
                textColor: [0, 0, 0],
                halign: 'center'
              }
            } as any);
          } else {
            rowData.push({ content: '-', styles: { halign: 'center', textColor: [180, 180, 180] } } as any);
          }
        });
        body.push(rowData);
      }

      // Footer Row: TOTAL
      const foot = [{ content: 'TOTAL', styles: { halign: 'center', fontStyle: 'bold', fillColor: [30, 30, 80], textColor: [255, 255, 255] } }];
      room.layout.forEach(col => {
        const aisleTotal = col.benches.reduce((sum, b) => sum + (b.left ? 1 : 0) + (b.right ? 1 : 0), 0);
        foot.push({ content: aisleTotal.toString(), colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [30, 30, 80], textColor: [255, 255, 255] } } as any);
      });
      body.push(foot);

      // Color legend for departments
      const allDeptsInRoom = Array.from(new Set(room.allocations.map(a => a.dept)));
      const legendText = allDeptsInRoom.map(d => `${d}: ${getBranchName(d)}`).join('   |   ');

      autoTable(doc, {
        startY: 36,
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
             doc.restoreGraphicsState();
             const text = 'REGISTRATION NUMBER';
             const textWidth = doc.getTextWidth(text);
             doc.text(text, x + (width/2) + 4, y + (height/2) + (textWidth/2), { angle: 90 });
             data.cell.text = ['']; 
          }
        },
        didDrawPage: (data) => {
          // Draw legend at bottom of each page
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.setFont('helvetica', 'normal');
          doc.text(`COLOR LEGEND:  ${legendText}`, 40, pageHeight - 18);

          // Draw colored squares for legend
          let legendX = 40 + doc.getTextWidth('COLOR LEGEND:  ');
          allDeptsInRoom.forEach(dept => {
            const color = getDeptColor(dept);
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(legendX - doc.getTextWidth(`${dept}: ${getBranchName(dept)}`) - 8, pageHeight - 23, 6, 6, 'F');
          });
        },
        margin: { left: 40, right: 40, bottom: 30 },
      });
    });

    const fileName = specificRoom 
      ? `Seat_Allocation_${specificRoom.roomName}_${new Date().toLocaleDateString()}.pdf`
      : `Complete_Seat_Allocation_${new Date().toLocaleDateString()}.pdf`;

    doc.save(fileName);
    toast.success(specificRoom ? `Room ${specificRoom.roomName} PDF ready` : 'Full PDF report ready');
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-100 dark:border-blue-900/50 transition-all hover:shadow-md group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Smart Distribute</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Interleave students from different semesters</p>
                    </div>
                  </div>
                  <Switch 
                    checked={smartDistribute} 
                    onCheckedChange={setSmartDistribute}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>

                <Separator />

                  <div className="space-y-4">
                    {/* Filters are now managed Globally via the Top Bar */}
                    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-800/50">
                      <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-500 uppercase">College:</span>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{globalFilters.college === 'all' ? 'Every College' : globalFilters.college}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-500 uppercase">Sem:</span>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {globalFilters.semester.includes('all') || globalFilters.semester.length === 0 
                            ? 'All' 
                            : globalFilters.semester.sort().join(', ')}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-500 uppercase">Type:</span>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{globalFilters.type === 'all' ? 'All' : globalFilters.type}</span>
                      </div>
                      
                      {(globalFilters.college !== 'all' || (globalFilters.semester.length > 0 && !globalFilters.semester.includes('all')) || globalFilters.type !== 'all' || globalFilters.department !== 'all') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={resetFilters}
                          className="h-8 px-2 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 uppercase tracking-tight ml-auto"
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                        Department Selection
                      </Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const all: Record<string, number> = {};
                          DEPARTMENTS.forEach(d => { all[d] = availableStudentsByDept.get(d)?.length || 0; });
                          setDeptInputs(all);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wide"
                      >Select All</button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => setDeptInputs(Object.fromEntries(DEPARTMENTS.map(d => [d, 0])))}
                        className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wide"
                      >Clear</button>
                    </div>
                  </div>

                  {isLoadingDepts ? (
                    <div className="text-sm text-center text-slate-400 py-4">Loading departments from database...</div>
                  ) : DEPARTMENTS.length === 0 ? (
                    <div className="text-sm text-center text-slate-400 py-4">
                      No departments found in the database.<br />
                      <span className="text-xs">Add students with a department field first.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {DEPARTMENTS.map((dept) => {
                        const pool = availableStudentsByDept.get(dept)?.length || 0;
                        const selected = deptInputs[dept] ?? 0;
                        const isActive = selected > 0;
                        return (
                          <div
                            key={dept}
                            onClick={() => {
                              if (pool === 0) return;
                              setDeptInputs(prev => ({
                                ...prev,
                                [dept]: isActive ? 0 : pool
                              }));
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                              pool === 0
                                ? 'opacity-40 cursor-not-allowed border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800'
                                : isActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 shadow-md'
                                : 'border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isActive ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                              }`}>
                                {isActive && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <Badge className={`h-8 min-w-[55px] flex items-center justify-center font-bold ${isActive ? 'bg-blue-600' : 'bg-slate-400'}`}>
                                {dept}
                              </Badge>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">In Database</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                  {pool} students
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Select Count</span>
                              <Input 
                                type="number"
                                min={0}
                                max={pool}
                                value={selected}
                                onChange={(e) => handleDeptInputChange(dept, e.target.value)}
                                className="w-20 h-9 text-right font-black text-blue-600 bg-white dark:bg-slate-950 border-blue-400 focus:ring-blue-500 shadow-sm"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                onClick={() => downloadPDF()}
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => downloadPDF(room)}
                          className="ml-2 h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
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
                        {room.allocations.map((alloc) => (
                          <div key={alloc.dept} className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{alloc.dept}</span>
                            <div className="text-xl font-black text-slate-800 dark:text-slate-200">{alloc.students.length}</div>
                          </div>
                        ))}
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
