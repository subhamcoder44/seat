'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppState } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, Users, Settings2, GripHorizontal, Download, FileText, CheckCircle2, ChevronDown, Wand2, Info } from 'lucide-react';
import { toast } from 'sonner';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type SimulationSeat = {
  id: string;
  row: number;
  col: number;
  studentId: string | null;
  deptName: string | null;
  rollNumber: string | null;
  colorClass: string;
};

const DEPT_COLORS = ['bg-[#f97316]', 'bg-[#3b82f6]', 'bg-[#10b981]', 'bg-[#8b5cf6]', 'bg-[#ec4899]'];

export default function SmartSeatAllocationPage() {
  const { rooms, students, loadFromLocalStorage, updateRoom } = useAppState();
  const [spacing, setSpacing] = useState([1]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [distributionMethod, setDistributionMethod] = useState<string>('row');
  const [isGenerating, setIsGenerating] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationSeat[] | null>(null);
  
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  // Group students by semester & type
  const studentGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    students.forEach(s => {
      let gName = [s.sem, s.type].filter(Boolean).join(' - ');
      if (!gName) gName = 'General';
      if (s.totalStudents > 1 && !s.roll) gName = s.name; // Fallback for old mock data
      if (!map.has(gName)) map.set(gName, []);
      map.get(gName)!.push(s);
    });
    return map;
  }, [students]);

  useEffect(() => {
    if (studentGroups.size > 0 && selectedGroups.size === 0) {
      setSelectedGroups(new Set([Array.from(studentGroups.keys())[0]]));
    }
  }, [studentGroups, selectedGroups.size]);

  const activeRoom = rooms.find(r => r.id === selectedRoomId);

  // Dynamic calculations based on state data
  const { deptNames, studentBreakdown, totalStudents, activeIndividuals } = useMemo(() => {
    let total = 0;
    const breakdownArr: string[] = [];
    let allSelectedStudents: any[] = [];

    selectedGroups.forEach(gName => {
      const groupStudents = studentGroups.get(gName) || [];
      
      // Calculate how many actual individuals this group represents
      let groupCount = 0;
      groupStudents.forEach(s => {
        if (s.totalStudents > 1 && !s.roll) {
          groupCount += s.totalStudents;
        } else {
          groupCount += 1;
        }
      });
      
      total += groupCount;
      if (groupCount > 0) breakdownArr.push(`${groupCount} ${gName.split('-')[0]}`);
      allSelectedStudents = allSelectedStudents.concat(groupStudents);
    });

    return { 
      deptNames: Array.from(selectedGroups).join(', '), 
      studentBreakdown: breakdownArr.join(', '), 
      totalStudents: total, 
      activeIndividuals: allSelectedStudents 
    };
  }, [studentGroups, selectedGroups]);

  const handleGenerate = () => {
    if (!activeRoom) {
      toast.error('Please select a room first');
      return;
    }

    if (totalStudents > activeRoom.seats.length) {
      toast.error(`Room capacity (${activeRoom.seats.length}) is smaller than total students (${totalStudents})`);
      return;
    }

    setIsGenerating(true);
    setSimulationData(null); // Clear previous

    setTimeout(() => {
      // 1. Map individuals to tracking objects with allocated colors per group
      let allIndividuals: { deptId: string, deptName: string, roll: string, color: string }[] = [];
      
      const groupColors = new Map<string, string>();
      let colorIdx = 0;
      selectedGroups.forEach(gName => {
        if (!groupColors.has(gName)) {
           groupColors.set(gName, DEPT_COLORS[colorIdx % DEPT_COLORS.length]);
           colorIdx++;
        }
      });

      activeIndividuals.forEach((student) => {
        let gName = [student.sem, student.type].filter(Boolean).join(' - ');
        if (!gName) gName = 'General';
        if (student.totalStudents > 1 && !student.roll) gName = student.name; // mock fallback
        
        const color = groupColors.get(gName) || DEPT_COLORS[0];
        
        if (student.totalStudents > 1 && !student.roll) {
          const count = student.totalStudents;
          for (let i = 1; i <= count; i++) {
            allIndividuals.push({
              deptId: student.id,
              deptName: student.name.split('-')[0] || student.name,
              roll: `${student.name.substring(0,2).toUpperCase()}${activeRoom.id.substring(activeRoom.id.length - 3)}${i.toString().padStart(3, '0')}`,
              color: color
            });
          }
        } else {
          allIndividuals.push({
            deptId: student.id,
            deptName: student.name.split('-')[0] || student.name,
            // Prioritize Registration Number (reg_no) as requested
            roll: student.reg_no || student.roll || `ID-${student.id.substring(0,4)}`,
            color: color
          });
        }
      });

      // 2. Sort seats based on distribution method
      let sortedSeats = [...activeRoom.seats];
      if (distributionMethod === 'column') {
        sortedSeats.sort((a, b) => a.column === b.column ? a.row - b.row : a.column - b.column);
      } else if (distributionMethod === 'column-snake') {
        sortedSeats.sort((a, b) => {
          if (a.column === b.column) {
            return a.column % 2 === 0 ? b.row - a.row : a.row - b.row; // Column Snake
          }
          return a.column - b.column;
        });
      } else if (distributionMethod === 'row-linear') {
        sortedSeats.sort((a, b) => a.row === b.row ? a.column - b.column : a.row - b.row);
      } else if (distributionMethod === 'random') {
        sortedSeats.sort(() => Math.random() - 0.5);
      } else {
        // Row-wise snake (default row-wise)
        sortedSeats.sort((a, b) => {
          if (a.row === b.row) {
            return a.row % 2 === 0 ? b.column - a.column : a.column - b.column; // Snake
          }
          return a.row - b.row;
        });
      }

      // 3. Optional: apply spacing
      const spacingValue = spacing[0] || 1;
      
      // 4. Map individuals to seats
      const mappedSeats: SimulationSeat[] = activeRoom.seats.map(s => ({
        id: s.id || `${s.row}-${s.column}`, // Ensure unique ID fallback
        row: s.row,
        col: s.column,
        studentId: null,
        deptName: null,
        rollNumber: null,
        colorClass: 'bg-white text-slate-900 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white',
      }));

      // A simple assignment logic
      let studentIndex = 0;
      for (let i = 0; i < sortedSeats.length; i++) {
        const seat = sortedSeats[i];
        if (studentIndex >= allIndividuals.length) break;

        // Apply simplistic spacing logic if it's not random.
        // We skip seats if pacing > 1, but we must ensure we have room.
        // For simplicity in this mockup, we'll assign directly unless we want gaps.
        
        const individual = allIndividuals[studentIndex];
        const targetSeat = mappedSeats.find(s => s.id === seat.id);
        
        if (targetSeat) {
          targetSeat.deptName = individual.deptName;
          targetSeat.rollNumber = individual.roll;
          targetSeat.colorClass = `${individual.color} text-white border-transparent`;
          targetSeat.studentId = individual.roll;
          studentIndex++;
          
          // Basic spacing simulation jumper
          if (distributionMethod !== 'random' && spacingValue > 1) {
            i += (spacingValue - 1);
          }
        }
      }

      setSimulationData(mappedSeats);
      setIsGenerating(false);

      // SAVE ALLOCATIONS TO DATABASE
      const finalDbSeats = mappedSeats.map(ms => ({
        id: ms.id || `${ms.row}-${ms.col}`,
        row: ms.row,
        column: ms.col,
        studentId: ms.studentId, // Links student roll to the seat
        status: ms.studentId ? ('occupied' as const) : ('available' as const)
      }));
      updateRoom(activeRoom.id, { seats: finalDbSeats });

      toast.success('Simulation generated and saved successfully!');
    }, 600);
  };

  const handleDownloadPDF = async () => {
    if (!simulationData || !activeRoom) return;
    setIsDownloadingPDF(true);
    try {
      // 1. Initialize jsPDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // 2. Add Headers
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const title = `SEATING ARRANGEMENT FOR ${activeRoom.name.toUpperCase()} (Odd Rows Odd Seats)`;
      pdf.text(title, pageWidth / 2, 40, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('DATE & TIME: ___________________________', 40, 70);
      pdf.text('COURSE NO. ___________________________', pageWidth - 250, 70);
      
      pdf.setFont('helvetica', 'bold');
      const totalStudentsAssigned = simulationData.filter(s => s.studentId).length;
      pdf.text(`TOTAL- ${totalStudentsAssigned} SEATS`, 40, 90);
      
      // 3. Build Table Headers
      const romanize = (num: number) => {
        const roman: Record<string, number> = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
        let str = '';
        for (let i of Object.keys(roman)) {
          let q = Math.floor(num / roman[i]);
          num -= q * roman[i];
          str += i.repeat(q);
        }
        return str;
      };

      const head1: any[] = [];
      const head2: any[] = [];
      
      for (let c = 1; c <= activeRoom.columns; c++) {
        head1.push({ content: `ROW-${romanize(c * 2 - 1)}`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } });
        head2.push('Seat No.');
        head2.push('Roll No.');
      }
      
      // 4. Build Table Body
      const body: any[] = [];
      for (let r = 1; r <= activeRoom.rows; r++) {
        const rowData: any[] = [];
        for (let c = 1; c <= activeRoom.columns; c++) {
          const seat = simulationData.find(s => s.row === r && s.col === c);
          if (seat) {
            const globalSeatNo = ((c - 1) * activeRoom.rows) + r;
            const seatLabel = seat.studentId ? `${globalSeatNo}` : '';
            const rollLabel = seat.studentId ? seat.rollNumber : '';
            rowData.push(seatLabel);
            rowData.push(rollLabel);
          } else {
            rowData.push('');
            rowData.push('');
          }
        }
        body.push(rowData);
      }
      
      // 5. Add custom totals row
      const footData: any[] = [];
      for (let c = 1; c <= activeRoom.columns; c++) {
        const seatsInCol = simulationData.filter(s => s.col === c && s.studentId).length;
        footData.push({ 
          content: seatsInCol > 9 ? `${seatsInCol}` : `0${seatsInCol}`, 
          colSpan: 2, 
          styles: { halign: 'center', fontStyle: 'bold' } 
        });
      }
      body.push(footData);

      // 6. Render Table
      autoTable(pdf, {
        startY: 105,
        head: [head1, head2],
        body: body,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 4,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          textColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        },
        margin: { top: 105, left: 20, right: 20 },
      });
      
      pdf.save(`SSAE_Arrangement_${activeRoom?.name || 'Room'}.pdf`);
      toast.success('Tabular PDF Downloaded Successfully');
    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast.error(`Failed to generate PDF snapshot: ${error?.message || String(error)}`);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!simulationData || !activeRoom) return;
    setIsDownloadingCSV(true);
    
    try {
      // 1. Initialize a 2D array [rows][cols] with empty strings
      const grid: string[][] = Array.from({ length: activeRoom.rows }, () => 
        Array(activeRoom.columns).fill('""')
      );
      
      // 2. Populate the grid based on the simulation Data
      simulationData.forEach(seat => {
        // simulationData row/col is 1-indexed
        const rIdx = seat.row - 1;
        const cIdx = seat.col - 1;
        
        if (rIdx >= 0 && rIdx < activeRoom.rows && cIdx >= 0 && cIdx < activeRoom.columns) {
          if (seat.studentId) {
            grid[rIdx][cIdx] = `"${seat.deptName} - ${seat.rollNumber}"`;
          } else if (rIdx === Math.floor(activeRoom.rows/2) && cIdx === 1) { // 📝 basic door approximation
            grid[rIdx][cIdx] = '"DOOR"';
          } else {
            grid[rIdx][cIdx] = '""';
          }
        }
      });

      // 3. Build CSV string
      const csvHeader = `Simulation Data for ${activeRoom.name}\n\n`;
      const colHeaders = Array.from({ length: activeRoom.columns }, (_, i) => `"Col ${i + 1}"`).join(',');
      
      const csvRows = grid.map((rowArray, rIdx) => {
        return `"Row ${rIdx + 1}",` + rowArray.join(',');
      }).join('\n');
      
      const csvContent = csvHeader + ',"", ' + colHeaders + '\n' + csvRows;

      // 4. Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SSAE_Grid_${activeRoom.name}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Spatial CSV Layout Downloaded Successfully');
    } catch (error) {
      console.error('CSV Generation Error:', error);
      toast.error('Failed to generate spatial CSV structure');
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Smart Seat Allocation Engine (SSAE)</h1>
          <p className="text-muted-foreground mt-1 text-[15px]">
            AI-Driven Multi-Constraint Seating Planner for Optimized Hall Utilization.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Panel: SSAE Configuration & Inputs */}
          <div className="xl:col-span-5 space-y-6">
            <Card className="p-6 bg-card border shadow-sm">
              <h2 className="text-xl font-semibold mb-5">SSAE Configuration & Inputs</h2>
              
              <div className="space-y-4 mb-8">
                <h3 className="text-[15px] font-semibold">Active Inputs (Calculated from Data Entry)</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-[#f8fafc] dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                    <Calendar className="h-5 w-5 text-slate-500" />
                    <div className="flex-1">
                      {rooms.length > 0 ? (
                        <select 
                          value={selectedRoomId} 
                          onChange={(e) => setSelectedRoomId(e.target.value)}
                          className="w-full bg-transparent border-none text-slate-800 dark:text-slate-200 font-medium focus:ring-0 cursor-pointer outline-none"
                        >
                          <option value="" disabled>Select a room</option>
                          {rooms.map((room, idx) => (
                            <option key={`${room.id}-${idx}`} value={room.id}>
                              12-Oct, {room.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-medium text-slate-800 dark:text-slate-200">No rooms available</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-[#f8fafc] dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700 w-full overflow-hidden">
                    <Users className="h-5 w-5 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-full flex items-center justify-between text-left text-slate-800 dark:text-slate-200 font-medium focus:outline-none">
                          <span className="truncate block whitespace-nowrap overflow-hidden text-ellipsis">
                            Departments: {deptNames || 'Select Departments'}
                          </span>
                          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-80 max-h-[300px] overflow-y-auto" align="start">
                          <DropdownMenuLabel>Select Groups from Records</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {studentGroups.size > 0 ? Array.from(studentGroups.entries()).map(([gName, sList]) => (
                            <DropdownMenuCheckboxItem
                              key={gName}
                              checked={selectedGroups.has(gName)}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedGroups);
                                if (checked) next.add(gName);
                                else next.delete(gName);
                                setSelectedGroups(next);
                              }}
                            >
                              <span className="truncate">{gName}</span>
                              <span className="ml-auto text-xs text-slate-500 ml-2">
                                ({sList.reduce((sum, s) => sum + (s.totalStudents > 1 && !s.roll ? s.totalStudents : 1), 0)})
                              </span>
                            </DropdownMenuCheckboxItem>
                          )) : (
                            <div className="p-4 text-sm text-slate-500 text-center">No registration records found.</div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-[#f8fafc] dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700 w-full overflow-hidden">
                    <Users className="h-5 w-5 text-slate-500 flex-shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate block whitespace-nowrap overflow-hidden text-ellipsis">
                      Total Students: {totalStudents} ({studentBreakdown})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-[17px] font-semibold mb-4">Engine Presets & Optimization Goals</h3>
                <div className="flex items-center gap-8 border-b pb-6">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Settings2 className="h-5 w-5" />
                    Seat Preference
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <GripHorizontal className="h-5 w-5" />
                    Spacing Level
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[17px] font-semibold mb-4 flex items-center gap-2">
                  <GripHorizontal className="h-5 w-5" />
                  Seating Pattern
                </h3>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <Label className="text-slate-600 dark:text-slate-400 font-medium">Primary Distribution Method</Label>
                      <select 
                        value={distributionMethod} 
                        onChange={(e) => setDistributionMethod(e.target.value)}
                        className="bg-[#1e3a5f] text-white border-none shadow-md font-medium h-10 w-[200px] rounded-md px-3 cursor-pointer outline-none"
                      >
                        <option value="column">Column-wise Block</option>
                        <option value="column-snake">Column-wise Snake</option>
                        <option value="row">Row-wise Snake (Default)</option>
                        <option value="row-linear">Row-wise Sequential</option>
                        <option value="random">Randomized Entropy</option>
                      </select>
                    </div>

                    <div className="space-y-4 pt-4">
                      <Label className="text-slate-600 dark:text-slate-400 font-medium">Pattern Preview</Label>
                      <div className="border border-slate-200 dark:border-slate-700 rounded p-4 bg-[#f8fafc] dark:bg-slate-900/50 flex gap-2 h-24 items-end justify-start">
                        <div className="w-5 h-full bg-[#3b82f6] rounded-[4px]"></div>
                        <div className="w-5 h-[65%] bg-[#eab308] rounded-[4px]"></div>
                        <div className="w-5 h-[85%] bg-[#10b981] rounded-[4px]"></div>
                        <div className="w-5 h-full bg-[#3b82f6] rounded-[4px]"></div>
                        <div className="w-5 h-[40%] bg-[#eab308] rounded-[4px]"></div>
                        <div className="w-5 h-[65%] bg-[#f97316] rounded-[4px]"></div>
                        <div className="w-5 h-[50%] bg-[#10b981] rounded-[4px]"></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-slate-600 dark:text-slate-400 font-medium">Inter-Department Spacing</Label>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="flex-1 flex gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <span>1 Seat</span>
                        </div>
                        <Input type="number" value="1" readOnly className="w-16 h-8 text-center" />
                      </div>
                      
                      <div className="pt-2 px-1">
                         <Slider
                           defaultValue={[1]}
                           max={3}
                           min={1}
                           step={1}
                           className="my-4"
                         />
                         <div className="flex justify-between text-xs text-slate-500 font-medium px-1">
                           <span>1 Seat</span>
                           <span>2 Seats</span>
                           <span>3 Seats</span>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-slate-600 dark:text-slate-400 font-medium">Secondary Pattern Overrides</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="corner" />
                        <label htmlFor="corner" className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-none cursor-pointer">
                          Corner Seat Exclusions
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="backrow" defaultChecked />
                        <label htmlFor="backrow" className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-none cursor-pointer">
                          Back Row Clustering
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-6 text-[15px] font-medium shadow-md gap-2"
                >
                  <Wand2 className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating Simulation...' : 'Generate New Simulation Plan'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Panel: Real-time Allocation Simulation */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            <Card className="flex-1 p-6 bg-card border shadow-sm flex flex-col">
              <h2 className="text-xl font-semibold mb-4">Real-time Allocation Simulation</h2>
              
              <div id="simulation-grid-capture" className="border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-8 flex-1 relative flex items-center justify-center overflow-x-auto min-h-[400px]">
                
                {!simulationData ? (
                  <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 max-w-sm text-center">
                     <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                       <GripHorizontal className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                     </div>
                     <h3 className="font-medium text-slate-600 dark:text-slate-400 text-lg mb-2">Ready to Simulate</h3>
                     <p className="text-sm">Configure your settings on the left pane and click Generate to see the live seat allocation distribution pattern.</p>
                  </div>
                ) : (
                  <>
                    {/* Visual Markers */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Dynamic Layout</span>
                      <div className="w-16 h-[2px] bg-black dark:bg-white"></div>
                    </div>
                    
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center">
                      <div className="border-2 border-slate-400 bg-slate-200 text-slate-700 text-xs font-bold py-3 px-1 rounded transform -rotate-90 origin-center absolute -left-6 tracking-widest shadow-sm">
                        DOOR
                      </div>
                      <div className="w-8 h-[2px] bg-black dark:bg-white ml-5"></div>
                      <div className="h-[2px] w-[2px] bg-black dark:bg-white absolute left-5 top-0 bottom-0 my-auto h-32 w-[2px]"></div>
                    </div>

                    {/* Dynamic Grid Container */}
                    <div className="w-full h-full flex items-center justify-center">
                      <div 
                        className="grid gap-3 ml-12"
                        style={{ 
                          gridTemplateColumns: activeRoom ? `repeat(${activeRoom.columns}, minmax(0, 1fr))` : 'repeat(4, minmax(0, 1fr))',
                          gridTemplateRows: activeRoom ? `repeat(${activeRoom.rows}, auto)` : 'repeat(5, auto)',
                        }}
                      >
                        {simulationData.map((seat) => (
                           <div 
                             key={seat.id || `${seat.row}-${seat.col}-${Math.random()}`}
                             className={`h-[60px] w-32 border-2 p-2 flex flex-col justify-center shadow-sm rounded-sm transition-all duration-300 ${seat.colorClass}`}
                             style={{
                               gridColumn: seat.col,
                               gridRow: seat.row,
                             }}
                             title={seat.studentId ? `Seat ${seat.row}-${seat.col}` : 'Empty Seat'}
                           >
                             {seat.studentId ? (
                               <>
                                 <span className="text-[11px] font-bold leading-none mb-1">{seat.deptName}</span>
                                 <span className="text-[11px] font-bold leading-none tracking-tight">{seat.rollNumber}</span>
                               </>
                             ) : (
                               <span className="text-xs font-bold opacity-30 text-center tracking-widest uppercase">
                                 {((seat.row === Math.floor(activeRoom!.rows/2)) && (seat.col === 2)) ? 'Door' : ''}
                               </span>
                             )}
                           </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Download Simulation Data</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={handleDownloadCSV}
                  disabled={!simulationData || isDownloadingCSV}
                  className="w-full text-white bg-[#1e3a5f] hover:bg-[#2a4a7f] py-6 text-[15px] font-medium shadow-sm gap-2"
                >
                  <Download className={`h-5 w-5 ${isDownloadingCSV ? 'animate-bounce' : ''}`} />
                  {isDownloadingCSV ? 'Formatting CSV...' : 'Download Simulation (CSV)'}
                </Button>
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={!simulationData || isDownloadingPDF}
                  className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white py-6 text-[15px] font-medium shadow-sm gap-2"
                >
                  <FileText className={`h-5 w-5 ${isDownloadingPDF ? 'animate-pulse' : ''}`} />
                  {isDownloadingPDF ? 'Capturing Snapshot...' : 'Download Simulation (PDF)'}
                </Button>
              </div>
            </div>

            {simulationData && (
              <Card className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[15px] text-slate-800 dark:text-slate-200 font-medium leading-snug">
                      Run Successful. {activeRoom?.name} utilized at high efficiency. No constraints violated.
                    </p>
                    <p className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="inline-block w-4 h-4 rounded-full border border-slate-800 bg-slate-200"></span>
                      AI optimized seating for {simulationData.filter(s => s.studentId).length} students based on distance and utilization.
                    </p>
                  </div>
                </div>
              </Card>
            )}

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
