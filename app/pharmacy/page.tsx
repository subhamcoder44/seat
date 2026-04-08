'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppState, Student } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Users,
  DoorOpen,
  Plus,
  Trash2,
  Download,
  Shuffle,
  Wand2,
  FileText,
  Sparkles,
  FlaskConical,
  Building2,
  CheckCircle2,
  ChevronDown,
  X,
  Layers,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomAllocation = {
  roomNumber: number;
  roomName: string;
  pattern: string;
  capacity: number;
  selectedColleges: string[];
  selectedParts: string[];
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

const PATTERNS = [
  'Z-Pattern (Zig-Zag)',
  'Row-wise Linear',
  'Column-wise Linear',
  'Snake Pattern',
  'Random Distribution',
];

// ─── Color helpers ─────────────────────────────────────────────────────────────

const COLLEGE_BADGE_COLORS = [
  'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300',
  'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300',
  'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
];

const DEPT_PDF_COLORS: Record<string, [number, number, number]> = {
  DCST: [173, 216, 230],
  DCE: [255, 200, 120],
  DME: [255, 182, 193],
  DEE: [216, 191, 216],
};
const DEPT_PDF_DEFAULT: [number, number, number] = [198, 239, 206];

const getDeptColor = (dept: string): [number, number, number] =>
  DEPT_PDF_COLORS[dept] ?? DEPT_PDF_DEFAULT;

const getBranchName = (dept: string) => {
  const map: Record<string, string> = {
    DCST: 'DSCT',
    DCE: 'CIVIL ENGG',
    DME: 'MECH ENGG',
    DEE: 'ELECT ENGG',
  };
  return map[dept] || dept;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PharmacyAllocationPage() {
  const { students, fetchData } = useAppState();

  // ── College & Part selection state ──
  const [allColleges, setAllColleges] = useState<string[]>([]);
  const [selectedColleges, setSelectedColleges] = useState<Set<string>>(new Set());
  const [collegeDropdownOpen, setCollegeDropdownOpen] = useState(false);

  const [allParts, setAllParts] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());

  // ── Department inputs ──
  const [DEPARTMENTS, setDEPARTMENTS] = useState<string[]>([]);
  const [deptInputs, setDeptInputs] = useState<Record<string, number>>({});
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);

  // ── Room config ──
  const [roomName, setRoomName] = useState('');
  const [seatingPattern, setSeatingPattern] = useState(PATTERNS[0]);
  const [benchesPerRow, setBenchesPerRow] = useState(2);
  const [numRows, setNumRows] = useState(10);
  const [targetStudentCount, setTargetStudentCount] = useState(0);
  const [smartDistribute, setSmartDistribute] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);

  // ── Allocations ──
  const [roomAllocations, setRoomAllocations] = useState<RoomAllocation[]>([]);
  const [allocatedStudentIds, setAllocatedStudentIds] = useState<Set<string>>(new Set());

  const roomAllocationsRef = useRef<RoomAllocation[]>([]);
  const roomCounterRef = useRef<number>(0);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchData();

    // Restore saved pharmacy allocations
    const saved = localStorage.getItem('pharmacy_room_allocations');
    const savedIds = localStorage.getItem('pharmacy_allocated_ids');
    if (saved) {
      const parsed: RoomAllocation[] = JSON.parse(saved);
      setRoomAllocations(parsed);
      roomCounterRef.current = parsed.length;
    }
    if (savedIds) setAllocatedStudentIds(new Set(JSON.parse(savedIds)));

    // Fetch departments from DB
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

  // Keep ref in sync
  roomAllocationsRef.current = roomAllocations;

  // Persist
  useEffect(() => {
    localStorage.setItem('pharmacy_room_allocations', JSON.stringify(roomAllocations));
    localStorage.setItem('pharmacy_allocated_ids', JSON.stringify([...allocatedStudentIds]));
    if (roomAllocations.length > roomCounterRef.current) {
      roomCounterRef.current = roomAllocations.length;
    }
  }, [roomAllocations, allocatedStudentIds]);

  // Derive all unique colleges and parts from students
  useEffect(() => {
    const colleges = Array.from(new Set(students.map(s => s.inst_name).filter(Boolean))).sort();
    setAllColleges(colleges);
    const parts = Array.from(new Set(students.map(s => s.type).filter(Boolean))).sort();
    setAllParts(parts);
  }, [students]);

  // ── Derived: students filtered by selected college(s) & part(s) ──────────────────────
  const filteredStudents = useMemo(() => {
    if (selectedColleges.size === 0 || selectedParts.size === 0) return [];
    return students.filter(
      s => selectedColleges.has(s.inst_name) && selectedParts.has(s.type) && !allocatedStudentIds.has(s.id)
    );
  }, [students, selectedColleges, selectedParts, allocatedStudentIds]);

  // ── Available by dept (after college filter) ───────────────────────────────
  const availableStudentsByDept = useMemo(() => {
    const map = new Map<string, Student[]>();
    DEPARTMENTS.forEach(d => map.set(d, []));
    filteredStudents.forEach(s => {
      const dept = s.department || '';
      if (dept && DEPARTMENTS.includes(dept)) {
        if (!map.has(dept)) map.set(dept, []);
        map.get(dept)!.push(s);
      }
    });
    return map;
  }, [filteredStudents, DEPARTMENTS]);

  const totalAvailable = useMemo(() => {
    let n = 0;
    availableStudentsByDept.forEach(l => (n += l.length));
    return n;
  }, [availableStudentsByDept]);

  // College student counts (for badge display)
  const collegeStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allColleges.forEach(c => {
      counts[c] = students.filter(s => s.inst_name === c && !allocatedStudentIds.has(s.id)).length;
    });
    return counts;
  }, [allColleges, students, allocatedStudentIds]);

  // Part student counts (for badge display)
  const partStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allParts.forEach(p => {
      counts[p] = students.filter(s => selectedColleges.has(s.inst_name) && s.type === p && !allocatedStudentIds.has(s.id)).length;
    });
    return counts;
  }, [allParts, students, selectedColleges, allocatedStudentIds]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleCollege = (college: string) => {
    setSelectedColleges(prev => {
      const next = new Set(prev);
      if (next.has(college)) next.delete(college);
      else next.add(college);
      // Reset dept inputs when selection changes
      setDeptInputs(Object.fromEntries(DEPARTMENTS.map(d => [d, 0])));
      return next;
    });
  };

  const togglePart = (part: string) => {
    setSelectedParts(prev => {
      const next = new Set(prev);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      // Reset dept inputs when selection changes
      setDeptInputs(Object.fromEntries(DEPARTMENTS.map(d => [d, 0])));
      return next;
    });
  };

  const handleDeptInputChange = (dept: string, value: string) => {
    const num = parseInt(value) || 0;
    setDeptInputs(prev => ({ ...prev, [dept]: num }));
  };

  const handleAutoFill = () => {
    const maxCap = benchesPerRow * numRows * 2;
    const limit = targetStudentCount > 0 ? Math.min(targetStudentCount, maxCap) : maxCap;
    const newInputs = { ...deptInputs };
    const currentTotal = Object.values(newInputs).reduce((a, b) => a + b, 0);
    let remaining = limit - currentTotal;

    if (remaining <= 0) {
      toast.info(targetStudentCount > 0 ? `Target (${limit}) already reached` : 'Room is full');
      return;
    }

    for (const dept of DEPARTMENTS) {
      const available = availableStudentsByDept.get(dept)?.length || 0;
      const alreadySelected = newInputs[dept];
      const canAdd = Math.min(available - alreadySelected, remaining);
      if (canAdd > 0) {
        newInputs[dept] += canAdd;
        remaining -= canAdd;
      }
      if (remaining <= 0) break;
    }

    setDeptInputs(newInputs);
    toast.info(`Auto-filled up to ${limit - remaining} students`);
  };

  const handleAllocate = () => {
    if (selectedColleges.size === 0) {
      toast.error('Please select at least one college first');
      return;
    }
    
    if (selectedParts.size === 0) {
      toast.error('Please select at least one part first');
      return;
    }

    const totalSelected = Object.values(deptInputs).reduce((a, b) => a + b, 0);
    if (totalSelected === 0) {
      toast.error('Please select at least one student to allocate');
      return;
    }

    const maxCapacity = benchesPerRow * numRows * 2;
    if (totalSelected > maxCapacity) {
      toast.error(`Total (${totalSelected}) exceeds room capacity (${maxCapacity})`);
      return;
    }

    // Validate availability
    for (const dept of DEPARTMENTS) {
      const requested = deptInputs[dept];
      const available = availableStudentsByDept.get(dept)?.length || 0;
      if (requested > available) {
        toast.error(`Insufficient students in ${dept}. Requested: ${requested}, Available: ${available}`);
        return;
      }
    }

    // Build dept allocations
    const newAllocations: RoomAllocation['allocations'] = [];
    const newLocalIds = new Set(allocatedStudentIds);

    DEPARTMENTS.forEach(dept => {
      const count = deptInputs[dept];
      if (count > 0) {
        const studentList = [...(availableStudentsByDept.get(dept) || [])];
        const selected = studentList.slice(0, count);
        newAllocations.push({ dept, students: selected });
        selected.forEach(s => newLocalIds.add(s.id));
      }
    });

    // ── Layout engine (same as manual page) ───────────────────────────────

    let allStudents: Student[] = [];

    if (smartDistribute) {
      const semMap = new Map<string, Student[]>();
      newAllocations.forEach(a =>
        a.students.forEach(s => {
          if (!semMap.has(s.sem)) semMap.set(s.sem, []);
          semMap.get(s.sem)!.push(s);
        })
      );
      const sems = Array.from(semMap.keys()).sort();
      const maxSize = Math.max(...Array.from(semMap.values()).map(v => v.length));
      for (let i = 0; i < maxSize; i++) {
        sems.forEach(sem => {
          const list = semMap.get(sem);
          if (list && list[i]) allStudents.push(list[i]);
        });
      }
    } else {
      newAllocations.forEach(a => allStudents.push(...a.students));
    }

    const grid: (Student | null)[][] = Array.from({ length: numRows }, () =>
      Array(benchesPerRow * 2).fill(null)
    );

    const visitOrder: [number, number][] = [];

    if (seatingPattern === 'Column-wise Linear') {
      for (let c = 0; c < benchesPerRow * 2; c++)
        for (let r = 0; r < numRows; r++) visitOrder.push([r, c]);
    } else if (seatingPattern === 'Snake Pattern') {
      for (let c = 0; c < benchesPerRow * 2; c++) {
        if (c % 2 === 0) for (let r = 0; r < numRows; r++) visitOrder.push([r, c]);
        else for (let r = numRows - 1; r >= 0; r--) visitOrder.push([r, c]);
      }
    } else if (seatingPattern === 'Random Distribution') {
      const allPos: [number, number][] = [];
      for (let r = 0; r < numRows; r++)
        for (let c = 0; c < benchesPerRow * 2; c++) allPos.push([r, c]);
      for (let i = allPos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPos[i], allPos[j]] = [allPos[j], allPos[i]];
      }
      visitOrder.push(...allPos);
    } else if (seatingPattern === 'Z-Pattern (Zig-Zag)') {
      for (let r = 0; r < numRows; r++) {
        if (r % 2 === 0)
          for (let c = 0; c < benchesPerRow * 2; c++) visitOrder.push([r, c]);
        else
          for (let c = benchesPerRow * 2 - 1; c >= 0; c--) visitOrder.push([r, c]);
      }
    } else {
      for (let r = 0; r < numRows; r++)
        for (let c = 0; c < benchesPerRow * 2; c++) visitOrder.push([r, c]);
    }

    const deptQueues = newAllocations.map(a => ({ dept: a.dept, q: [...a.students] }));

    for (const [r, c] of visitOrder) {
      if (deptQueues.every(dq => dq.q.length === 0)) break;
      if (r >= numRows || c >= benchesPerRow * 2) continue;

      const neighbors = [
        r > 0 ? grid[r - 1][c] : null,
        r < numRows - 1 ? grid[r + 1][c] : null,
        c > 0 ? grid[r][c - 1] : null,
        c < benchesPerRow * 2 - 1 ? grid[r][c + 1] : null,
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
        if (fallback.length > 0) grid[r][c] = fallback[0].q.shift()!;
      }
    }

    const layout: RoomAllocation['layout'] = [];
    for (let c = 0; c < benchesPerRow; c++) {
      const colBenches = [];
      for (let r = 0; r < numRows; r++) {
        colBenches.push({
          benchIndex: r + 1 + c * numRows,
          left: grid[r][c * 2],
          right: grid[r][c * 2 + 1],
        });
      }
      layout.push({ columnIndex: c + 1, benches: colBenches });
    }

    const capturedName = roomName;
    roomCounterRef.current += 1;
    const nextNumber = roomCounterRef.current;
    const assignedName = capturedName || `Room ${nextNumber}`;

    const newRoom: RoomAllocation = {
      roomNumber: nextNumber,
      roomName: assignedName,
      pattern: seatingPattern,
      capacity: benchesPerRow * numRows * 2,
      selectedColleges: Array.from(selectedColleges),
      selectedParts: Array.from(selectedParts),
      allocations: newAllocations,
      layout,
      totalAllocated: totalSelected,
      numRows,
      benchesPerRow,
    };

    setRoomAllocations(prev => [...prev, newRoom]);
    setAllocatedStudentIds(newLocalIds);
    setDeptInputs(Object.fromEntries(DEPARTMENTS.map(d => [d, 0])));
    setRoomName('');
    toast.success(`${assignedName} allocated successfully!`);
  };

  const clearAllocations = () => {
    if (!confirm('Clear all pharmacy allocations?')) return;
    setRoomAllocations([]);
    setAllocatedStudentIds(new Set());
    setDeptInputs(Object.fromEntries(DEPARTMENTS.map(d => [d, 0])));
    setBenchesPerRow(2);
    setNumRows(10);
    setTargetStudentCount(0);
    setRoomName('');
    setSeatingPattern(PATTERNS[0]);
    setSelectedColleges(new Set());
    setSelectedParts(new Set());
    roomCounterRef.current = 0;
    localStorage.removeItem('pharmacy_room_allocations');
    localStorage.removeItem('pharmacy_allocated_ids');
    toast.info('All pharmacy allocations cleared');
  };

  // ── PDF ────────────────────────────────────────────────────────────────────

  const downloadPDF = (specificRoom?: RoomAllocation) => {
    const latestAllocations = specificRoom ? [specificRoom] : roomAllocationsRef.current;
    if (latestAllocations.length === 0) {
      toast.error('No allocations to export');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    latestAllocations.forEach((room, roomIdx) => {
      if (roomIdx > 0) doc.addPage();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(88, 28, 135);
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(
        `PHARMACY — ROOM : ${room.roomName.toUpperCase()}`,
        pageWidth / 2,
        19,
        { align: 'center' }
      );
      doc.setTextColor(0, 0, 0);

      const collegesLabel = room.selectedColleges.join(' & ');
      const partsLabel = room.selectedParts.join(' & ');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Colleges: ${collegesLabel} | Parts: ${partsLabel}`, 40, 38);

      const uniqueDepts = Array.from(new Set(room.allocations.map(a => a.dept)));
      const branchSummary = uniqueDepts.map(d => getBranchName(d)).join(' & ');
      const headerTitle = `${room.roomName.toUpperCase()} — ${branchSummary.toUpperCase()}`;

      const head1 = [
        {
          content: headerTitle,
          colSpan: 1 + room.layout.length * 2,
          styles: {
            halign: 'center',
            fillColor: [88, 28, 135],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 12,
          },
        } as any,
      ];

      const head2: any[] = [
        {
          content: 'BRANCH',
          styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        },
      ];
      room.layout.forEach(col => {
        const aisleDeptsInCol = Array.from(
          new Set(
            col.benches.flatMap(b =>
              [b.left?.department, b.right?.department].filter(Boolean) as string[]
            )
          )
        );
        const aisleNames = aisleDeptsInCol.map(d => getBranchName(d)).join(' & ');
        const fillColor: [number, number, number] =
          aisleDeptsInCol.length === 1 ? getDeptColor(aisleDeptsInCol[0]) : [220, 220, 220];
        head2.push({
          content: aisleNames,
          colSpan: 2,
          styles: { halign: 'center', fillColor, textColor: [0, 0, 0], fontStyle: 'bold' },
        } as any);
      });

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
              textColor: [0, 0, 0],
            },
          } as any);
        }
        room.layout.forEach(col => {
          const bench = col.benches[r];
          const lv = bench?.left?.reg_no?.trim() || bench?.left?.roll?.trim() || bench?.left?.name?.trim() || '-';
          const rv = bench?.right?.reg_no?.trim() || bench?.right?.roll?.trim() || bench?.right?.name?.trim() || '-';

          if (bench?.left) {
            rowData.push({
              content: lv,
              styles: { fillColor: getDeptColor(bench.left.department), textColor: [0, 0, 0], halign: 'center' },
            } as any);
          } else {
            rowData.push({ content: '-', styles: { halign: 'center', textColor: [180, 180, 180] } } as any);
          }
          if (bench?.right) {
            rowData.push({
              content: rv,
              styles: { fillColor: getDeptColor(bench.right.department), textColor: [0, 0, 0], halign: 'center' },
            } as any);
          } else {
            rowData.push({ content: '-', styles: { halign: 'center', textColor: [180, 180, 180] } } as any);
          }
        });
        body.push(rowData);
      }

      const foot = [
        { content: 'TOTAL', styles: { halign: 'center', fontStyle: 'bold', fillColor: [88, 28, 135], textColor: [255, 255, 255] } },
      ];
      room.layout.forEach(col => {
        const total = col.benches.reduce((s, b) => s + (b.left ? 1 : 0) + (b.right ? 1 : 0), 0);
        foot.push({
          content: total.toString(),
          colSpan: 2,
          styles: { halign: 'center', fontStyle: 'bold', fillColor: [88, 28, 135], textColor: [255, 255, 255] },
        } as any);
      });
      body.push(foot);

      const allDeptsInRoom = Array.from(new Set(room.allocations.map(a => a.dept)));
      const legendText = allDeptsInRoom.map(d => `${d}: ${getBranchName(d)}`).join('   |   ');

      autoTable(doc, {
        startY: 44,
        head: [head1, head2],
        body,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 6, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0] },
        didDrawCell: data => {
          if (
            data.section === 'body' &&
            data.column.index === 0 &&
            data.cell.raw === 'REGISTRATION NUMBER'
          ) {
            const { x, y, width, height } = data.cell;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            const text = 'REGISTRATION NUMBER';
            const textWidth = doc.getTextWidth(text);
            doc.text(text, x + width / 2 + 4, y + height / 2 + textWidth / 2, { angle: 90 });
            data.cell.text = [''];
          }
        },
        didDrawPage: data => {
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.setFont('helvetica', 'normal');
          doc.text(`COLOR LEGEND:  ${legendText}`, 40, pageHeight - 18);
        },
        margin: { left: 40, right: 40, bottom: 30 },
      });
    });

    const fileName = specificRoom
      ? `Pharmacy_${specificRoom.roomName}_${new Date().toLocaleDateString()}.pdf`
      : `Pharmacy_Complete_Allocation_${new Date().toLocaleDateString()}.pdf`;
    doc.save(fileName);
    toast.success(specificRoom ? `Room ${specificRoom.roomName} PDF ready` : 'Full Pharmacy PDF ready');
  };

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalSelection = Object.values(deptInputs).reduce((a, b) => a + b, 0);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/30">
              <FlaskConical className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Pharmacy Seat Allocation
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                College-wise filtered manual seat allocation for pharmacy students.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setIsShuffling(true); setTimeout(() => { toast.success('Students shuffled'); setIsShuffling(false); }, 800); }}
              disabled={isShuffling}
              className="gap-2"
            >
              <Shuffle className={`h-4 w-4 ${isShuffling ? 'animate-spin' : ''}`} />
              Shuffle Pool
            </Button>
            <Button
              variant="outline"
              onClick={clearAllocations}
              className="text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50 bg-white dark:bg-slate-950"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>

        {/* ── College Filter Banner ── */}
        <Card className="p-5 border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
            <h2 className="text-base font-bold text-violet-900 dark:text-violet-200">
              Step 1 — Select College(s)
            </h2>
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {selectedColleges.size} selected · {filteredStudents.length} students available
            </span>
          </div>

          {/* College pills / dropdown */}
          {allColleges.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No colleges found in the database.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allColleges.map((college, idx) => {
                const isSelected = selectedColleges.has(college);
                const count = collegeStudentCounts[college] ?? 0;
                const colorClass = COLLEGE_BADGE_COLORS[idx % COLLEGE_BADGE_COLORS.length];
                return (
                  <button
                    key={college}
                    onClick={() => toggleCollege(college)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all select-none ${
                      isSelected
                        ? `${colorClass} border-current shadow-md scale-[1.02]`
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-300 hover:text-violet-700 dark:hover:border-violet-600'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="max-w-[200px] truncate">{college}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {count}
                    </span>
                    {isSelected && <X className="h-3 w-3 opacity-60" />}
                  </button>
                );
              })}
            </div>
          )}

          {selectedColleges.size > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-black text-violet-500 uppercase tracking-wide">Active:</span>
              {Array.from(selectedColleges).map(c => (
                <Badge key={c} className="bg-violet-600 text-white text-[10px] truncate max-w-[180px]">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* ── Part Filter Banner (Step 2) ── */}
        <Card className="p-5 border-violet-200 dark:border-violet-800 bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-950/20 dark:to-fuchsia-950/20 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <h2 className="text-base font-bold text-purple-900 dark:text-purple-200">
              Step 2 — Select Part(s)
            </h2>
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {selectedParts.size} selected
            </span>
          </div>

          {allParts.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No parts found in the database.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allParts.map((part, idx) => {
                const isSelected = selectedParts.has(part);
                const count = partStudentCounts[part] ?? 0;
                // Using different set of colors for parts
                const colorClass = isSelected 
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300 hover:text-purple-700 dark:hover:border-purple-600';
                
                return (
                  <button
                    key={part}
                    onClick={() => togglePart(part)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all select-none ${colorClass}`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span className="max-w-[200px] truncate">{part}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/30 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {count}
                    </span>
                    {isSelected && <X className="h-3 w-3 opacity-60" />}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Left: Room Config ── */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 border-slate-200 shadow-xl bg-white dark:bg-slate-950 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <DoorOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="text-xl font-bold">Room Config</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ph-roomName" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Room Number / Name
                    </Label>
                    <Input
                      id="ph-roomName"
                      placeholder={`Room ${roomAllocations.length + 1}`}
                      value={roomName}
                      onChange={e => setRoomName(e.target.value)}
                      className="h-11 border-2 focus:ring-violet-500 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ph-numRows" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Number of Rows
                    </Label>
                    <Input
                      id="ph-numRows"
                      type="number"
                      min={1}
                      value={numRows}
                      onChange={e => setNumRows(parseInt(e.target.value) || 1)}
                      className="h-11 text-lg font-bold border-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ph-benches" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Benches per Row
                    </Label>
                    <Input
                      id="ph-benches"
                      type="number"
                      min={1}
                      max={10}
                      value={benchesPerRow}
                      onChange={e => setBenchesPerRow(parseInt(e.target.value) || 1)}
                      className="h-11 text-lg font-bold border-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="ph-target" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Total Students to Allocate
                    </Label>
                    <Input
                      id="ph-target"
                      type="number"
                      min={0}
                      value={targetStudentCount}
                      onChange={e => setTargetStudentCount(parseInt(e.target.value) || 0)}
                      className="h-11 text-lg font-bold border-2 focus:ring-violet-500"
                      placeholder="Optional: Auto-fill limit"
                    />
                    <p className="text-[10px] text-slate-400 font-medium italic">
                      Capacity: {numRows * benchesPerRow * 2} students
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Seating Pattern
                  </Label>
                  <select
                    value={seatingPattern}
                    onChange={e => setSeatingPattern(e.target.value)}
                    className="w-full h-11 px-3 border-2 rounded-md focus:ring-violet-500 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  >
                    {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Smart distribute toggle */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-xl border border-violet-100 dark:border-violet-900/50 transition-all hover:shadow-md group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Smart Distribute</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        Interleave students from different semesters
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={smartDistribute}
                    onCheckedChange={setSmartDistribute}
                    className="data-[state=checked]:bg-violet-600"
                  />
                </div>

                <Separator />

                {/* Step 2 — Dept selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Step 3 — Department Selection
                    </Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const all: Record<string, number> = {};
                          DEPARTMENTS.forEach(d => { all[d] = availableStudentsByDept.get(d)?.length || 0; });
                          setDeptInputs(all);
                        }}
                        className="text-[10px] font-bold text-violet-600 hover:underline uppercase tracking-wide"
                      >Select All</button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => setDeptInputs(Object.fromEntries(DEPARTMENTS.map(d => [d, 0])))}
                        className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wide"
                      >Clear</button>
                    </div>
                  </div>

                  {selectedColleges.size === 0 || selectedParts.size === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-violet-200 dark:border-violet-800 rounded-xl">
                      <Building2 className="h-8 w-8 text-violet-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">Select college(s) and part(s) above to see students</p>
                    </div>
                  ) : isLoadingDepts ? (
                    <div className="text-sm text-center text-slate-400 py-4">Loading departments...</div>
                  ) : DEPARTMENTS.length === 0 ? (
                    <div className="text-sm text-center text-slate-400 py-4">No departments found.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {DEPARTMENTS.map(dept => {
                        const pool = availableStudentsByDept.get(dept)?.length || 0;
                        const selected = deptInputs[dept] ?? 0;
                        const isActive = selected > 0;
                        return (
                          <div
                            key={dept}
                            onClick={() => {
                              if (pool === 0) return;
                              setDeptInputs(prev => ({ ...prev, [dept]: isActive ? 0 : pool }));
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                              pool === 0
                                ? 'opacity-40 cursor-not-allowed border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800'
                                : isActive
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-500 shadow-md'
                                : 'border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 hover:border-violet-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isActive ? 'border-violet-500 bg-violet-500' : 'border-slate-300'}`}>
                                {isActive && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <Badge className={`h-8 min-w-[55px] flex items-center justify-center font-bold ${isActive ? 'bg-violet-600' : 'bg-slate-400'}`}>
                                {dept}
                              </Badge>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">In College Filter</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                  {pool} students
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end" onClick={e => e.stopPropagation()}>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Select Count</span>
                              <Input
                                type="number"
                                min={0}
                                max={pool}
                                value={selected}
                                onChange={e => handleDeptInputChange(dept, e.target.value)}
                                className="w-20 h-9 text-right font-black text-violet-600 bg-white dark:bg-slate-950 border-violet-400 focus:ring-violet-500 shadow-sm"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Totals + actions */}
                <div className="pt-4 space-y-3">
                  <div className="flex justify-between items-center text-sm font-medium p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Total Selection:</span>
                    <span className={`text-lg font-bold ${totalSelection > benchesPerRow * numRows * 2 ? 'text-red-500' : 'text-violet-600'}`}>
                      {totalSelection} / {benchesPerRow * numRows * 2}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={handleAutoFill}
                      className="w-full h-11 gap-2 border-violet-200 text-violet-600 hover:bg-violet-50 bg-white dark:bg-slate-900"
                    >
                      <Wand2 className="h-4 w-4" />
                      Auto-fill Remaining
                    </Button>
                    <Button
                      onClick={handleAllocate}
                      className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2 shadow-lg shadow-violet-500/20"
                    >
                      <Plus className="h-5 w-5" />
                      Allocate to {roomName || `Room ${roomAllocations.length + 1}`}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Live stats card */}
            <Card className="p-5 bg-gradient-to-br from-violet-900 to-purple-900 text-white border-none overflow-hidden relative shadow-2xl">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 flex items-start gap-4">
                <div className="p-2 bg-violet-500/20 rounded-xl">
                  <Users className="h-5 w-5 text-violet-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold mb-3 uppercase tracking-widest text-violet-300/60">Live Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-violet-300/40 uppercase font-black">Total Pool</span>
                      <span className="text-xl font-black">{students.length}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-violet-300/40 uppercase font-black">Filtered</span>
                      <span className="text-xl font-black text-cyan-400">{filteredStudents.length}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-violet-300/40 uppercase font-black">Allocated</span>
                      <span className="text-xl font-black text-emerald-400">{allocatedStudentIds.size}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-violet-300/40 uppercase font-black">Rooms</span>
                      <span className="text-xl font-black text-orange-400">{roomAllocations.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Right: Allocation History ── */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                Allocation History
              </h2>
              <Button
                onClick={() => downloadPDF()}
                disabled={roomAllocations.length === 0}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-lg shadow-violet-500/20"
              >
                <Download className="h-4 w-4" />
                Download All PDF
              </Button>
            </div>

            {roomAllocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-violet-200 rounded-3xl bg-violet-50/30 dark:border-violet-800 dark:bg-violet-900/5">
                <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md mb-6 rotate-3">
                  <FlaskConical className="h-8 w-8 text-violet-300" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  Pharmacy System Ready
                </h3>
                <p className="text-slate-500 text-center max-w-xs text-sm font-medium">
                  Select a college, choose departments, and allocate seats to see results here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {roomAllocations.map(room => (
                  <Card
                    key={room.roomNumber}
                    className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-lg"
                  >
                    {/* Room header */}
                    <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-violet-200 uppercase tracking-widest">
                            Pharmacy · Room #{room.roomNumber}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-white">{room.roomName}</h3>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {room.selectedColleges.map(c => (
                            <span key={c} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold truncate max-w-[160px]">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-white">{room.totalAllocated}</div>
                        <div className="text-xs text-violet-200 font-semibold">of {room.capacity} seats</div>
                        <Button
                          size="sm"
                          onClick={() => downloadPDF(room)}
                          className="mt-2 bg-white/20 hover:bg-white/30 text-white border-white/30 border gap-1.5 text-xs"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </Button>
                      </div>
                    </div>

                    {/* Dept breakdown */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Department Breakdown</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {room.allocations.map(a => (
                          <div key={a.dept} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
                            <Badge className="bg-violet-600 text-white text-[10px] h-5">{a.dept}</Badge>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{a.students.length}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bench layout table */}
                    <div className="p-6 overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="py-2 px-2 font-black text-slate-400 uppercase text-[10px] text-left w-16">Bench</th>
                            {room.layout.map(col => (
                              <th
                                key={col.columnIndex}
                                className="py-2 px-2 font-black uppercase text-[10px] text-center border border-slate-200 dark:border-slate-700"
                                colSpan={2}
                              >
                                Aisle {col.columnIndex}
                              </th>
                            ))}
                          </tr>
                          <tr>
                            <th />
                            {room.layout.map(col => (
                              <>
                                <th key={`${col.columnIndex}-L`} className="py-1 px-2 text-[9px] font-bold text-slate-400 text-center border border-slate-200 dark:border-slate-700">LEFT</th>
                                <th key={`${col.columnIndex}-R`} className="py-1 px-2 text-[9px] font-bold text-slate-400 text-center border border-slate-200 dark:border-slate-700">RIGHT</th>
                              </>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: room.numRows }).map((_, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-900/20' : ''}>
                              <td className="py-1.5 px-2 font-black text-slate-400 text-[10px]">B{rIdx + 1}</td>
                              {room.layout.map(col => {
                                const bench = col.benches[rIdx];
                                const renderCell = (student: Student | null) => student ? (
                                  <td key={student.id} className="py-1.5 px-2 border border-slate-200 dark:border-slate-700">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="font-black text-[9px] text-violet-600 dark:text-violet-400">{student.department}</span>
                                      <span className="text-[9px] text-slate-700 dark:text-slate-300 font-semibold">
                                        {student.reg_no || student.roll || student.name}
                                      </span>
                                    </div>
                                  </td>
                                ) : (
                                  <td key={`empty-${col.columnIndex}-${rIdx}`} className="py-1.5 px-2 border border-slate-200 dark:border-slate-700 text-center text-slate-300 text-[9px]">—</td>
                                );
                                return (
                                  <>
                                    {renderCell(bench?.left ?? null)}
                                    {renderCell(bench?.right ?? null)}
                                  </>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-violet-50 dark:bg-violet-900/10">
                            <td className="py-2 px-2 font-black text-[10px] text-violet-700 dark:text-violet-300 uppercase">Total</td>
                            {room.layout.map(col => {
                              const total = col.benches.reduce((s, b) => s + (b.left ? 1 : 0) + (b.right ? 1 : 0), 0);
                              return (
                                <td key={col.columnIndex} colSpan={2} className="py-2 px-2 text-center font-black text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-sm">
                                  {total}
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
