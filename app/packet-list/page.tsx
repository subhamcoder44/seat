'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppState } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Printer, 
  Package, 
  ChevronDown, 
  Users, 
  RefreshCw, 
  Plus, 
  Trash2,
  FileSpreadsheet,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';

type CohortPacket = {
  id: string; // roomId-studentId/dept
  branchName: string;
  semester: string;
  rolls: string[];
  count: number;
  date?: string;
  subject?: string;
  qcode?: string;
  half1?: boolean;
  half2?: boolean;
  absent?: string;
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
  
  // Header Config
  const [institution, setInstitution] = useState('BPC INSTITUTE OF TECHNOLOGY');
  const [examSession, setExamSession] = useState('Academic Session 2025-2026');

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

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
        const identifier = student?.reg_no || seat.studentId || '-';
        if (identifier && !group.rolls.includes(identifier)) {
            group.rolls.push(identifier);
        }
      });

      const packets = Array.from(cohortData.entries()).map(([key, group]) => ({
        id: `${room.id}-${key}-${Math.random().toString(36).substr(2, 5)}`,
        branchName: group.branchName,
        semester: group.sem,
        rolls: group.rolls.sort(),
        count: group.count,
        date: '',
        subject: '',
        qcode: '',
        half1: false,
        half2: false,
        absent: ''
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
      count: 0,
      date: '',
      subject: '',
      qcode: '',
      half1: false,
      half2: false,
      absent: ''
    };
    newData[roomIdx].packets.push(newPacket);
    saveToLocalStorage(newData);
  };

  const deleteRow = (roomIdx: number, packetIdx: number) => {
    const newData = [...data];
    newData[roomIdx].packets.splice(packetIdx, 1);
    saveToLocalStorage(newData);
  };

  const totalPapersRequired = data.reduce((sum, room) => sum + room.packets.reduce((s, p) => s + (p.count || 0), 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <MainLayout>
      <div className="space-y-8 pb-20 print:space-y-0 print:pb-0">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-950 p-8 rounded-[2rem] border shadow-xl print:hidden">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
                <FileSpreadsheet className="h-8 w-8" />
             </div>
             <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Packet Distribution</h1>
                <p className="text-slate-500 font-medium">Official exam script inventory management.</p>
             </div>
          </div>
          
          <div className="flex gap-3">
             <Button onClick={syncWithAllocations} variant="outline" className="h-12 px-6 rounded-xl border-slate-200 font-bold gap-2">
                <RefreshCw size={18} /> Sync Data
             </Button>
             <Button onClick={handlePrint} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black gap-2 shadow-xl shadow-blue-500/20 transition-transform active:scale-95">
                <Printer size={18} /> Print All Packets
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
           {/* Sidebar Config - Hidden in print */}
           <div className="lg:col-span-3 space-y-6 print:hidden">
              <Card className="p-6 rounded-[1.5rem] shadow-lg border-slate-200 bg-white dark:bg-slate-950">
                 <div className="flex items-center gap-2 mb-6">
                    <Settings2 className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-bold">Document Setup</h2>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Institution Name</Label>
                       <Input value={institution} onChange={e => setInstitution(e.target.value)} className="bg-slate-50 border-none font-bold" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Exam Session</Label>
                       <Input value={examSession} onChange={e => setExamSession(e.target.value)} className="bg-slate-50 border-none" />
                    </div>
                 </div>
              </Card>

              <Card className="p-6 rounded-[1.5rem] shadow-lg border-slate-200 bg-slate-900 text-white">
                 <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Total Scripts Required</p>
                 <p className="text-4xl font-black">{totalPapersRequired}</p>
                 <div className="mt-4 pt-4 border-t border-white/10 text-[10px] font-medium text-slate-400">
                    Calculated from current seat allocations.
                 </div>
              </Card>
           </div>

           {/* Main Content Area */}
           <div className="lg:col-span-9 space-y-8 print:w-full print:m-0">
             {data.map((roomData, roomIdx) => (
               <Card key={`${roomData.roomId}-${roomIdx}`} className="overflow-hidden border-2 shadow-sm rounded-[2rem] print:rounded-none print:shadow-none print:border-none print:break-after-page">
                 {/* Room/Institution Header for PDF */}
                 <div className="hidden print:block text-center space-y-1 mb-6 mt-4">
                    <h1 className="text-xl font-bold uppercase">{institution}</h1>
                    <p className="text-sm font-medium">{examSession}</p>
                    <h2 className="text-lg font-bold border-b-2 border-slate-800 inline-block px-8 py-1 mt-2">PACKET DISTRIBUTION LIST</h2>
                    <div className="flex justify-between items-center mt-4 px-2">
                       <p className="font-bold">ROOM NO: {roomData.roomName.toUpperCase()}</p>
                       <p className="font-bold">TOTAL STUDENTS: {roomData.totalAllocated}</p>
                    </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-4 flex justify-between items-center border-b print:hidden">
                    <h2 className="text-xl font-black flex items-center gap-3">
                       <ChevronDown className="text-blue-500" />
                       ROOM {roomData.roomName.toUpperCase()}
                       <Badge variant="outline" className="ml-2 bg-white text-[10px] uppercase">{roomData.totalAllocated} Scripts</Badge>
                    </h2>
                    <Button onClick={() => addRow(roomIdx)} variant="ghost" size="sm" className="h-9 px-4 rounded-xl gap-2 font-bold text-blue-600 hover:bg-blue-50">
                       <Plus size={16} /> Add Packet
                    </Button>
                 </div>

                 {/* Official Table matching requested format */}
                 <div className="overflow-x-auto p-2 print:p-0">
                   <table className="w-full text-xs border-collapse border border-black print:text-[10px] font-serif">
                     <thead>
                       <tr className="bg-slate-100 print:bg-white text-black font-bold">
                         <th className="border border-black p-2 w-10 text-center" rowSpan={2}>SL. NO</th>
                         <th className="border border-black p-2 w-24 text-center" rowSpan={2}>Date of Examination</th>
                         <th className="border border-black p-1 text-center" colSpan={2}>Half</th>
                         <th className="border border-black p-2 w-48 text-left" rowSpan={2}>Name of the Subject</th>
                         <th className="border border-black p-2 w-20 text-center" rowSpan={2}>Question Code</th>
                         <th className="border border-black p-2 w-36 text-left" rowSpan={2}>Name of the Branch</th>
                         <th className="border border-black p-2 w-10 text-center" rowSpan={2}>Semester</th>
                         <th className="border border-black p-2 min-w-[150px] text-left" rowSpan={2}>Details of the candidate</th>
                         <th className="border border-black p-2 w-12 text-center" rowSpan={2}>Absent</th>
                         <th className="border border-black p-2 w-12 text-center" rowSpan={2}>Total</th>
                         <th className="border border-black p-2 w-10 text-center print:hidden" rowSpan={2}></th>
                       </tr>
                       <tr className="bg-slate-50 print:bg-white text-black font-bold">
                         <th className="border border-black p-1 text-center w-8">1</th>
                         <th className="border border-black p-1 text-center w-8">2</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-black">
                       {roomData.packets.map((packet, pIdx) => (
                         <tr key={packet.id} className="hover:bg-slate-50/50 group/row">
                           <td className="border border-black p-1 text-center font-bold">{pIdx + 1}</td>
                           <td className="border border-black p-1">
                             <input 
                               value={packet.date || ''} 
                               onChange={e => handleDataUpdate(roomIdx, pIdx, 'date', e.target.value)}
                               className="w-full bg-transparent border-none text-center focus:ring-0 p-0 text-[10px]" 
                               placeholder="DD-MM-YYYY"
                             />
                           </td>
                           <td className="border border-black p-1 text-center">
                              <input 
                                type="checkbox" 
                                checked={packet.half1} 
                                onChange={e => handleDataUpdate(roomIdx, pIdx, 'half1', e.target.checked)}
                                className="w-3 h-3 cursor-pointer"
                              />
                           </td>
                           <td className="border border-black p-1 text-center">
                              <input 
                                type="checkbox" 
                                checked={packet.half2} 
                                onChange={e => handleDataUpdate(roomIdx, pIdx, 'half2', e.target.checked)}
                                className="w-3 h-3 cursor-pointer"
                              />
                           </td>
                           <td className="border border-black p-1">
                             <textarea 
                               value={packet.subject || ''} 
                               onChange={e => handleDataUpdate(roomIdx, pIdx, 'subject', e.target.value)}
                               className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none leading-tight h-8"
                               placeholder="Enter Subject..."
                             />
                           </td>
                           <td className="border border-black p-1">
                             <input 
                               value={packet.qcode || ''} 
                               onChange={e => handleDataUpdate(roomIdx, pIdx, 'qcode', e.target.value)}
                               className="w-full bg-transparent border-none text-center focus:ring-0 p-0 font-bold"
                             />
                           </td>
                           <td className="border border-black p-1">
                              <input 
                                value={packet.branchName} 
                                onChange={e => handleDataUpdate(roomIdx, pIdx, 'branchName', e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 p-0 uppercase"
                              />
                           </td>
                           <td className="border border-black p-1 text-center font-bold">
                              <input 
                                value={packet.semester} 
                                onChange={e => handleDataUpdate(roomIdx, pIdx, 'semester', e.target.value)}
                                className="w-full bg-transparent border-none text-center focus:ring-0 p-0"
                              />
                           </td>
                           <td className="border border-black p-2">
                              <textarea 
                                value={packet.rolls.join(', ')} 
                                onChange={e => handleDataUpdate(roomIdx, pIdx, 'rolls', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                                className="w-full text-[9px] font-mono leading-none bg-transparent border-none focus:ring-0 p-0 min-h-[40px] resize-none"
                              />
                           </td>
                           <td className="border border-black p-1">
                             <input 
                               value={packet.absent || ''} 
                               onChange={e => handleDataUpdate(roomIdx, pIdx, 'absent', e.target.value)}
                               className="w-full bg-transparent border-none text-center focus:ring-0 p-0" 
                             />
                           </td>
                           <td className="border border-black p-1 text-center font-black">
                             <input 
                               type="number"
                               value={packet.count} 
                               onChange={e => handleDataUpdate(roomIdx, pIdx, 'count', parseInt(e.target.value) || 0)}
                               className="w-full bg-transparent border-none text-center focus:ring-0 p-0 font-black text-blue-600 print:text-black" 
                             />
                           </td>
                           <td className="border border-black p-1 text-center print:hidden">
                             <button onClick={() => deleteRow(roomIdx, pIdx)} className="text-red-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                             </button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>

                   <div className="hidden print:flex flex-col items-end gap-12 mt-12 pb-8">
                      <div className="text-center">
                         <div className="border-b-2 border-slate-800 w-48 mb-2"></div>
                         <p className="text-[10px] font-bold uppercase tracking-widest">Invigilator SIGNATURE</p>
                      </div>
                   </div>
                 </div>
               </Card>
             ))}
           </div>
        </div>
      </div>
    </MainLayout>
  );
}
