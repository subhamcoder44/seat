'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppState } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Printer, Download, Package, FileText, CheckCircle2, ChevronDown, Check, Users, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type CohortPacket = {
  id: string; // roomId-studentId/dept
  branchName: string;
  semester: string;
  rolls: string[];
  count: number;
};

type RoomPacketData = {
  roomId: string;
  roomName: string;
  building: string;
  totalAllocated: number;
  packets: CohortPacket[];
};

export default function PacketListPage() {
  const { rooms, students, loadFromLocalStorage } = useAppState();
  const [data, setData] = useState<RoomPacketData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  const [edits, setEdits] = useState<Record<string, Record<string, any>>>({});

  const getBranchName = (dept: string) => {
    const mapping: Record<string, string> = {
      'DCST': 'DSCT',
      'DCE': 'CIVIL ENGG',
      'DME': 'MECH ENGG',
      'DEE': 'ELECT ENGG'
    };
    return mapping[dept] || dept;
  };

  const syncWithAllocations = () => {
    if (rooms.length === 0 || students.length === 0) {
       toast.error('No allocations found to sync');
       return;
    }

    const compiledData: RoomPacketData[] = [];

    rooms.forEach(room => {
      const allocatedSeats = room.seats.filter(s => s.studentId);
      if (allocatedSeats.length === 0) return;

      const cohortData = new Map<string, { branchName: string, sem: string, count: number, rolls: string[] }>();
      
      allocatedSeats.forEach(seat => {
        const student = students.find(st => st.id === seat.studentId || st.roll === seat.studentId || st.reg_no === seat.studentId);
        
        const dept = student?.department || 'OTHER';
        const sem = student?.sem || '-';
        const key = `${dept}-${sem}`;

        if (!cohortData.has(key)) {
            cohortData.set(key, { 
              branchName: getBranchName(dept), 
              sem: sem, 
              count: 0, 
              rolls: [] 
            });
        }
        const group = cohortData.get(key)!;
        group.count += 1;
        if (seat.studentId && !group.rolls.includes(seat.studentId)) {
            group.rolls.push(seat.studentId);
        }
      });

      const packets = Array.from(cohortData.entries()).map(([key, group]) => ({
        id: `${room.id}-${key}-${Math.random().toString(36).substr(2, 5)}`,
        branchName: group.branchName,
        semester: group.sem,
        rolls: group.rolls.sort(),
        count: group.count
      })).sort((a, b) => a.branchName.localeCompare(b.branchName));

      compiledData.push({
        roomId: room.id,
        roomName: room.name,
        building: room.building || 'A',
        totalAllocated: allocatedSeats.length,
        packets
      });
    });

    compiledData.sort((a, b) => {
      if (a.building === b.building) return a.roomName.localeCompare(b.roomName);
      return a.building.localeCompare(b.building);
    });

    setData(compiledData);
    setIsLoaded(true);
    localStorage.setItem('manual-packet-data', JSON.stringify(compiledData));
    toast.success('Synced with latest allocations');
  };

  useEffect(() => {
    if (!isLoaded && rooms.length > 0 && students.length > 0) {
      syncWithAllocations();
    }
  }, [rooms, students, isLoaded]);

  const saveToLocalStorage = (newData: RoomPacketData[]) => {
    setData(newData);
    localStorage.setItem('manual-packet-data', JSON.stringify(newData));
  };

  const handleEdit = (rowId: string, field: string, value: any) => {
    const newEdits = {
      ...edits,
      [rowId]: {
        ...(edits[rowId] || {}),
        [field]: value
      }
    };
    setEdits(newEdits);
    localStorage.setItem('packet-row-edits', JSON.stringify(newEdits));
  };

  const handleDataUpdate = (roomIdx: number, packetIdx: number, field: keyof CohortPacket, value: any) => {
    const newData = [...data];
    const packet = { ...newData[roomIdx].packets[packetIdx] };
    (packet as any)[field] = value;
    newData[roomIdx].packets[packetIdx] = packet;
    saveToLocalStorage(newData);
  };

  const addRow = (roomIdx: number) => {
    const newData = [...data];
    const newPacket: CohortPacket = {
      id: `manual-${Date.now()}`,
      branchName: '',
      semester: '',
      rolls: [],
      count: 0
    };
    newData[roomIdx].packets.push(newPacket);
    saveToLocalStorage(newData);
    toast.success('Blank packet added to room');
  };

  const deleteRow = (roomIdx: number, packetIdx: number) => {
    if (!confirm('Are you sure you want to remove this packet entry?')) return;
    const newData = [...data];
    newData[roomIdx].packets.splice(packetIdx, 1);
    saveToLocalStorage(newData);
    toast.success('Packet entry removed');
  };

  const totalPacketsFound = data.reduce((sum, room) => sum + room.packets.length, 0);
  const totalPapersRequired = data.reduce((sum, room) => sum + room.packets.reduce((s, p) => s + (p.count || 0), 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <MainLayout>
      <div className="space-y-8 print:space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-950 p-8 rounded-[2rem] border shadow-2xl relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-600/5 -skew-x-12 translate-x-20 print:hidden"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <Package className="h-8 w-8 text-white" />
              </div>
              Packet Distribution List
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-lg font-medium print:hidden">
              Official inventory control for question paper distribution across university exam halls.
            </p>
            <div className="hidden print:flex flex-col gap-1 mt-4 text-slate-900 text-sm font-bold uppercase tracking-widest">
              <span>Examination Session: ___________________</span>
              <span>Date: ___________________</span>
            </div>
          </div>
          
          <div className="flex gap-3 print:hidden relative z-10">
            <Button onClick={syncWithAllocations} variant="outline" className="h-14 px-6 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold gap-2 shadow-sm">
              <RefreshCw className="h-5 w-5" />
              Sync
            </Button>
            <Button onClick={handlePrint} className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black gap-2 shadow-xl shadow-blue-500/20 group">
              <Printer className="h-5 w-5 group-hover:scale-110 transition-transform" />
              Printout
            </Button>
          </div>
        </div>

        {/* Global Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 print:hidden">
          <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-2 bg-blue-500"></div>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Package size={32} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Active Rooms</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-4xl font-black text-slate-900 dark:text-white">{data.length}</p>
                   <span className="text-xs font-bold text-emerald-500">READY</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-2 bg-amber-500"></div>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <FileText size={32} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Subject Packets</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-4xl font-black text-slate-900 dark:text-white">{totalPacketsFound}</p>
                   <span className="text-xs font-bold text-amber-500">MANUAL CRUD</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-2 bg-emerald-500"></div>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Scripts</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-4xl font-black text-slate-900 dark:text-white">{totalPapersRequired}</p>
                   <span className="text-xs font-bold text-emerald-500">REQUIRED</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Area */}
        {data.length > 0 ? (
          <div className="space-y-8 print:space-y-8">
            {data.map((roomData, roomIdx) => (
              <Card key={`${roomData.roomId}-${roomIdx}`} className="overflow-hidden border shadow-sm print:shadow-none print:border-slate-400 print:break-inside-avoid">
                {/* Room Header */}
                <div className="bg-slate-900 dark:bg-slate-950 px-8 py-6 flex justify-between items-center border-b border-white/10 print:bg-slate-200 print:text-black print:border-b-4 print:border-black">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white dark:text-slate-100 tracking-tight flex items-center gap-3 print:text-black">
                       <span className="p-1.5 bg-blue-600/20 rounded-lg print:hidden">
                         <ChevronDown className="h-5 w-5 text-blue-400" />
                       </span>
                       {roomData.roomName.toLowerCase().includes('room') ? '' : 'ROOM '} {roomData.roomName.toUpperCase()} 
                       <Badge className="ml-3 font-black px-3 py-1 bg-white/10 text-white border-none tracking-widest text-[10px] print:hidden">BLDG: {roomData.building}</Badge>
                    </h2>
                    <div className="flex gap-6 mt-1">
                      <p className="text-xs text-blue-300 font-bold uppercase tracking-widest flex items-center gap-1.5 print:text-black">
                        <Users className="h-3 w-3" />
                        Allocated: <span className="text-white print:text-black ml-1 font-black underline decoration-blue-500 decoration-2">{roomData.totalAllocated}</span>
                      </p>
                      <p className="text-xs text-blue-300 font-bold uppercase tracking-widest flex items-center gap-1.5 print:text-black">
                        <Package className="h-3 w-3" />
                        Packets: <span className="text-white print:text-black ml-1 font-black">{roomData.packets.length}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 print:hidden">
                    <Button 
                      onClick={() => addRow(roomIdx)}
                      variant="outline" 
                      className="bg-white/10 hover:bg-white/20 text-white border-none font-bold gap-2 text-xs h-10 px-4"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Packet
                    </Button>
                    <div className="flex items-center gap-3 border-2 border-white/20 rounded-xl px-5 py-2.5 bg-white/5 backdrop-blur-sm print:bg-white print:border-black print:border-3 print:rounded-none">
                       <div className="w-5 h-5 border-2 border-white/40 rounded-md bg-transparent flex items-center justify-center print:border-black"></div>
                       <span className="font-black text-white text-[10px] tracking-widest uppercase print:text-black print:text-xs">Verified</span>
                    </div>
                  </div>
                </div>

                {/* Modern Table matching the requested format */}
                <div className="overflow-x-auto bg-white p-2 print:p-0">
                  <table className="w-full text-xs border-collapse border border-black print:text-[11px] mb-4">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-50 text-slate-900 font-black border-b-[3px] border-slate-900 uppercase tracking-tighter text-[9px] print:border-black print:text-black">
                        <th className="border-x border-slate-200 p-3 w-10 text-center print:border-black">SL.</th>
                        <th className="border-x border-slate-200 p-3 w-28 print:border-black">Exam Date</th>
                        <th className="border-x border-slate-200 p-1 w-10 text-center print:border-black">FN</th>
                        <th className="border-x border-slate-200 p-1 w-10 text-center print:border-black">AN</th>
                        <th className="border-x border-slate-200 p-3 w-36 print:border-black text-left">Subject Name</th>
                        <th className="border-x border-slate-200 p-3 w-20 text-center print:border-black">Code</th>
                        <th className="border-x border-slate-200 p-3 w-32 print:border-black text-left">Branch</th>
                        <th className="border-x border-slate-200 p-3 w-12 text-center print:border-black">SEM</th>
                        <th className="border-x border-slate-200 p-3 w-64 text-left print:border-black">Roll List</th>
                        <th className="border-x border-slate-200 p-3 w-12 text-center print:border-black">ABS</th>
                        <th className="border-x border-slate-200 p-3 w-12 text-center print:border-black">TOT</th>
                        <th className="border-x border-slate-200 p-3 w-10 text-center print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomData.packets.map((packet, pIdx) => {
                        const rowState = edits[packet.id] || {};
                        return (
                          <tr key={`${packet.id}-${pIdx}`} className="text-slate-700 print:text-black hover:bg-slate-50 transition-colors group/row">
                            <td className="border border-slate-200 print:border-black p-2 text-center font-bold text-slate-400 print:text-black">
                              {pIdx + 1}
                            </td>
                            <td className="border border-slate-200 print:border-black p-1">
                              <Input 
                                value={rowState.date || ''}
                                onChange={e => handleEdit(packet.id, 'date', e.target.value)}
                                className="h-8 border-transparent focus:bg-slate-100 shadow-none p-1 w-full text-xs bg-transparent"
                                placeholder="DD/MM/YYYY"
                              />
                            </td>
                            <td className="border border-slate-200 print:border-black p-1 text-center align-middle">
                              <input 
                                type="checkbox"
                                checked={rowState.half1 || false}
                                onChange={e => handleEdit(packet.id, 'half1', e.target.checked)}
                                className="w-4 h-4 cursor-pointer accent-blue-600"
                              />
                            </td>
                            <td className="border border-slate-200 print:border-black p-1 text-center align-middle">
                               <input 
                                type="checkbox"
                                checked={rowState.half2 || false}
                                onChange={e => handleEdit(packet.id, 'half2', e.target.checked)}
                                className="w-4 h-4 cursor-pointer accent-blue-600"
                              />
                            </td>
                            <td className="border border-slate-200 print:border-black p-1">
                              <Input 
                                value={rowState.subject || ''}
                                onChange={e => handleEdit(packet.id, 'subject', e.target.value)}
                                className="h-8 border-transparent focus:bg-slate-100 shadow-none p-1 w-full text-xs bg-transparent"
                                placeholder="Subject Description"
                              />
                            </td>
                            <td className="border border-slate-200 print:border-black p-1">
                              <Input 
                                value={rowState.qcode || ''}
                                onChange={e => handleEdit(packet.id, 'qcode', e.target.value)}
                                className="h-8 border-transparent focus:bg-slate-100 shadow-none p-1 w-full text-xs bg-transparent text-center font-black"
                                placeholder="CODE"
                              />
                            </td>
                            <td className="border border-slate-200 print:border-black p-1">
                               <Input 
                                value={packet.branchName}
                                onChange={e => handleDataUpdate(roomIdx, pIdx, 'branchName', e.target.value)}
                                className="h-8 border-transparent focus:bg-slate-100 shadow-none p-1 w-full text-xs bg-transparent font-black uppercase"
                              />
                            </td>
                            <td className="border border-slate-200 print:border-black p-1">
                               <Input 
                                value={packet.semester}
                                onChange={e => handleDataUpdate(roomIdx, pIdx, 'semester', e.target.value)}
                                className="h-8 border-transparent focus:bg-slate-100 shadow-none p-1 w-full text-xs bg-transparent text-center font-black"
                              />
                            </td>
                            <td className="border border-slate-200 print:border-black p-2">
                               <textarea 
                                value={packet.rolls.length > 0 ? packet.rolls.join(', ') : ''}
                                onChange={e => handleDataUpdate(roomIdx, pIdx, 'rolls', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                className="w-full text-[9px] font-mono leading-tight bg-transparent border-none focus:ring-1 focus:ring-blue-200 resize-none min-h-[32px] p-1 text-slate-500 print:text-black"
                                rows={2}
                              />
                            </td>
                            <td className="border border-slate-200 print:border-black p-1">
                              <Input 
                                value={rowState.absent || ''}
                                onChange={e => handleEdit(packet.id, 'absent', e.target.value)}
                                className="h-8 border-transparent focus:bg-slate-100 shadow-none p-1 w-full text-xs bg-transparent text-center font-bold"
                                placeholder="0"
                              />
                            </td>
                            <td className="border border-slate-200 print:border-black p-1">
                               <Input 
                                type="number"
                                value={packet.count}
                                onChange={e => handleDataUpdate(roomIdx, pIdx, 'count', parseInt(e.target.value) || 0)}
                                className="h-8 border-transparent focus:bg-slate-100 shadow-none p-1 w-full text-xs bg-transparent text-center font-black text-blue-600 print:text-black"
                              />
                            </td>
                            <td className="border-none p-1 text-center print:hidden">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 opacity-0 group-hover/row:opacity-100 transition-opacity"
                                onClick={() => deleteRow(roomIdx, pIdx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-16 text-center border-dashed border-2 flex flex-col items-center justify-center print:hidden bg-slate-50/50 dark:bg-slate-900/10 rounded-[2rem]">
            <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl flex items-center justify-center mb-6">
              <Package size={40} className="text-blue-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-2">No Packet Inventory Data</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed font-medium">
              Click <strong>Sync</strong> to pull data from your current allocations, or add manual entries by clicking the Add button.
            </p>
            <Button onClick={syncWithAllocations} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-bold gap-2">
               <RefreshCw size={18} />
               Initial Sync with Allocations
            </Button>
          </Card>
        )}
        
        {/* Footer for dynamic print page */}
        <div className="hidden print:flex justify-between items-end pt-12 text-sm font-medium text-slate-500 border-t-2 border-slate-800 mt-[100px]">
           <p className="italic">Generated by Advanced Exam Seat Management System</p>
           <div className="text-center">
             <div className="border-b border-black w-64 mb-2"></div>
             <p className="text-black font-semibold uppercase tracking-wider text-xs">Controller of Examinations / Invigilator Signature</p>
           </div>
        </div>

      </div>
    </MainLayout>
  );
}
