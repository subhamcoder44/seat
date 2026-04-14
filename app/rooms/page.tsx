'use client';

import { useState, useEffect } from 'react';
import { useAppState, ExamRoom } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit2, Eye, Search, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function RoomsPage() {
  const { rooms, addRoom, updateRoom, deleteRoom, loadFromLocalStorage } = useAppState();

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    building: 'A',
    floor: 1,
    totalCapacity: 30,
    roomType: 'Standard',
    rows: 6,
    columns: 5,
    doorPosition: 'left',
    status: 'Available',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<ExamRoom | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Room Number/Name is required');
      return;
    }
    
    // Prevent duplicate room names
    const isDuplicate = rooms.some(r => r.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && r.id !== formData.id);
    if (isDuplicate) {
      toast.error(`A room named "${formData.name}" already exists!`);
      return;
    }
    
    setIsLoading(true);
    try {
      if (formData.id) {
        await updateRoom(formData.id, formData);
        toast.success('Room updated successfully');
      } else {
        await addRoom(formData);
        toast.success('Room created successfully');
      }
      handleClear();
    } catch (error) {
      toast.error('Failed to save room details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      id: '',
      name: '',
      building: 'A',
      floor: 1,
      totalCapacity: 30,
      roomType: 'Standard',
      rows: 6,
      columns: 5,
      doorPosition: 'left',
      status: 'Available',
    });
  };

  const handleEdit = (room: ExamRoom) => {
    setFormData({
      id: room.id,
      name: room.name,
      building: room.building || 'A',
      floor: room.floor || 1,
      totalCapacity: room.totalCapacity || (room.rows * room.columns),
      roomType: room.roomType || 'Standard',
      rows: room.rows,
      columns: room.columns,
      doorPosition: room.doorPosition || 'left',
      status: room.status || 'Available',
    });
  };

  const handleDelete = async () => {
    if (!roomToDelete) return;
    try {
      await deleteRoom(roomToDelete);
      toast.success('Room deleted successfully');
      if (formData.id === roomToDelete) {
        handleClear();
      }
    } catch (error) {
      toast.error('Failed to delete room');
    } finally {
      setRoomToDelete(null);
    }
  };

  const filteredRooms = rooms.filter(
    (room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.building && room.building.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'In Use': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'Inactive': return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Room Management Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Panel: Form */}
          <Card className="xl:col-span-4 p-6 bg-card">
            <h2 className="text-xl font-semibold mb-6">Add / Edit Room Details</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Number/Name</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="302"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Building Name</Label>
                  <Select value={formData.building} onValueChange={(v) => setFormData({ ...formData, building: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Dropdown" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Floor Number</Label>
                  <Input 
                    type="number" 
                    value={formData.floor} 
                    onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Capacity</Label>
                  <Input 
                    type="number" 
                    value={formData.totalCapacity} 
                    onChange={(e) => setFormData({ ...formData, totalCapacity: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Room Type</Label>
                <Select value={formData.roomType} onValueChange={(v) => setFormData({ ...formData, roomType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Classroom, Lecture Hall, Lab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Classroom">Classroom</SelectItem>
                    <SelectItem value="Lecture Hall">Lecture Hall</SelectItem>
                    <SelectItem value="Lab">Lab</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Grid Layout (Rows × Cols)</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-b-none border-b-0" onClick={() => setFormData({ ...formData, rows: formData.rows + 1, totalCapacity: (formData.rows + 1) * formData.columns })}>
                          <ChevronUp size={14} />
                        </Button>
                        <div className="flex h-10 w-8 items-center justify-center border-x border-input bg-background text-sm">
                          {formData.rows}
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-t-none border-t-0" onClick={() => setFormData({ ...formData, rows: Math.max(1, formData.rows - 1), totalCapacity: Math.max(1, formData.rows - 1) * formData.columns })}>
                          <ChevronDown size={14} />
                        </Button>
                      </div>
                      <span className="text-muted-foreground font-medium">×</span>
                      <div className="flex items-center justify-center border border-input rounded-md px-3 h-10 bg-background text-sm font-medium">
                        {formData.columns}
                      </div>
                      <span className="text-muted-foreground font-medium">=</span>
                      <div className="flex flex-col">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-b-none border-b-0" onClick={() => setFormData({ ...formData, columns: formData.columns + 1, totalCapacity: formData.rows * (formData.columns + 1) })}>
                          <ChevronUp size={14} />
                        </Button>
                        <div className="flex h-10 w-8 items-center justify-center border-x border-input bg-background text-sm">
                          {formData.columns}
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-t-none border-t-0" onClick={() => setFormData({ ...formData, columns: Math.max(1, formData.columns - 1), totalCapacity: formData.rows * Math.max(1, formData.columns - 1) })}>
                          <ChevronDown size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Door Position</Label>
                    <Select value={formData.doorPosition} onValueChange={(v) => setFormData({ ...formData, doorPosition: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Door" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Seat Preview */}
                <div className="h-full min-h-[160px] bg-slate-50 dark:bg-slate-900 rounded-lg border flex items-center justify-center p-4 relative overflow-hidden">
                  {formData.doorPosition === 'left' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-slate-200 dark:bg-slate-800 text-xs text-slate-500 py-4 px-1 rounded-r border-y border-r flex items-center justify-center writing-vertical-lr tracking-widest font-medium">
                      DOOR
                    </div>
                  )}
                  {formData.doorPosition === 'right' && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-slate-200 dark:bg-slate-800 text-xs text-slate-500 py-4 px-1 rounded-l border-y border-l flex items-center justify-center writing-vertical-lr tracking-widest font-medium rotate-180">
                      DOOR
                    </div>
                  )}
                  
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${formData.columns}, minmax(0, 1fr))` }}>
                    {Array.from({ length: Math.min(formData.rows * formData.columns, 42) }).map((_, i) => (
                      <div key={i} className="w-5 h-5 md:w-6 md:h-6 rounded-sm border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Label>Status</Label>
                <Switch 
                  checked={formData.status === 'Available'} 
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'Available' : 'Inactive' })} 
                />
              </div>

              <div className="flex gap-4 pt-6">
                <Button onClick={handleSave} disabled={isLoading} className="bg-[#1a1f36] hover:bg-[#2a314d] text-white px-8">
                  {isLoading ? 'Saving...' : 'Save Room Details'}
                </Button>
                <Button variant="outline" onClick={handleClear} disabled={isLoading} className="px-8">
                  Clear Form
                </Button>
              </div>
            </div>
          </Card>

          {/* Right Panel: Table and Upcoming */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <Card className="flex-1 p-6 bg-card flex flex-col">
              <h2 className="text-xl font-semibold mb-6">Room Inventory & Status</h2>
              
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search Room ID or Building..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-md overflow-hidden flex-1">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Room ID</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Building</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Floor</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Total Capacity</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Room Type</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Current Plan</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRooms.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No rooms found matching your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRooms.map((room, idx) => (
                        <TableRow key={room.id || `room-${idx}`} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setSelectedRoom(room)}>
                          <TableCell className="font-medium">{room.name}</TableCell>
                          <TableCell>{room.building || '-'}</TableCell>
                          <TableCell>{room.floor || '-'}</TableCell>
                          <TableCell>{room.totalCapacity || room.seats.length}</TableCell>
                          <TableCell>{room.roomType || 'Standard'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-medium border ${getStatusColor(room.status || 'Available')}`}>
                              {room.status || 'Available'}
                            </Badge>
                          </TableCell>
                          <TableCell>{room.currentPlan || 'No Plan'}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onClick={(e) => { e.stopPropagation(); handleEdit(room); }}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 dark:hover:text-red-400" onClick={(e) => { e.stopPropagation(); setRoomToDelete(room.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <h2 className="text-lg font-semibold mb-4">
                Upcoming Room Allocations {selectedRoom ? `(on Room: ${selectedRoom.name})` : ''}
              </h2>
              {selectedRoom ? (
                <div className="space-y-2 text-muted-foreground">
                  <p>10-Oct: CST3 (1061-1766)</p>
                  <p>12-Oct: ME2 (2201-2250)</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Select a room to view upcoming allocations</p>
              )}
            </Card>
          </div>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={roomToDelete !== null} onOpenChange={(open) => !open && setRoomToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Room?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the room matching ID and all its seat allocations. This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-4 mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
