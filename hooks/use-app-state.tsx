'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

export interface Student {
  id: string;
  name: string;
  email: string;
  rollRangeStart: string;
  rollRangeEnd: string;
  totalStudents: number;
  seatingPlan: string;
  
  // New fields
  reg_no: string;
  roll: string;
  no: string;
  sem: string;
  type: string;
  inst_id: string;
  inst_name: string;
  exam_centre_code: string;
  exam_centre_name: string;
  department: string;
}



export interface Seat {
  id: string;
  row: number;
  column: number;
  studentId: string | null;
  status: 'available' | 'occupied' | 'blocked';
}

export interface Room {
  id: string;
  name: string;
  building: string;
  floor: number;
  totalCapacity: number;
  roomType: string;
  rows: number;
  columns: number;
  doorPosition: string;
  status: string;
  currentPlan: string;
  seats: Seat[];
  createdAt: string;
}

// Keep the old type alias for backwards compatibility in pages
export type ExamRoom = Room;

export interface Schedule {
  id: string;
  date: string;
  time: string;
  semesters: string[];
  createdAt: string;
}

export interface GlobalFilters {
  college: string;
  semester: string[];
  department: string;
  type: string;
  scheduleId: string;
}

interface AppStateContextType {
  rooms: Room[];
  students: Student[]; // This now acts as Departments
  loading: boolean;
  globalFilters: GlobalFilters;
  setGlobalFilters: (filters: Partial<GlobalFilters>) => void;
  resetFilters: () => void;
  fetchData: () => Promise<void>;
  addRoom: (data: { name: string; building?: string; floor?: number; totalCapacity?: number; roomType?: string; rows: number; columns: number; doorPosition?: string; status?: string }) => Promise<void>;
  updateRoom: (id: string, room: Partial<Room>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  addStudent: (data: Partial<Student>) => Promise<void>;
  addStudentsBulk: (data: Partial<Student>[]) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  deleteAllStudents: () => Promise<void>;
  allocateSeat: (roomId: string, seatId: string, studentId: string) => Promise<void>;
  deallocateSeat: (roomId: string, seatId: string) => Promise<void>;
  // Keep legacy names so pages that call them don't break
  loadFromLocalStorage: () => Promise<void>;
  saveToLocalStorage: () => void;
  allocateStudentToSeat: (roomId: string, seatId: string, studentId: string) => Promise<void>;
  deallocateStudentFromSeat: (roomId: string, seatId: string) => Promise<void>;
  findStudentSeat: (query: string) => { room: Room, seat: Seat, student: Student } | null;
  // Schedules
  schedules: Schedule[];
  fetchSchedules: () => Promise<void>;
  addSchedule: (data: Omit<Schedule, 'id' | 'createdAt'>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilters, setGlobalFiltersState] = useState<GlobalFilters>({
    college: 'all',
    semester: ['all'],
    department: 'all',
    type: 'all',
    scheduleId: 'all'
  });
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const setGlobalFilters = useCallback((updates: Partial<GlobalFilters>) => {
    setGlobalFiltersState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setGlobalFiltersState({
      college: 'all',
      semester: ['all'],
      department: 'all',
      type: 'all',
      scheduleId: 'all'
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, studentsRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/students'),
      ]);
      const roomsData = await roomsRes.json();
      const studentsData = await studentsRes.json();
      setRooms(Array.isArray(roomsData) ? roomsData.map((r: any) => ({ ...r, id: r.id || r._id })) : []);
      setStudents(Array.isArray(studentsData) ? studentsData.map((s: any) => ({ ...s, id: s.id || s._id })) : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addRoom = useCallback(async (data: { name: string; building?: string; floor?: number; totalCapacity?: number; roomType?: string; rows: number; columns: number; doorPosition?: string; status?: string }) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const newRoom = await res.json();
      setRooms((prev) => [newRoom, ...prev]);
    } catch (error) {
      console.error('Failed to add room:', error);
    }
  }, []);

  const updateRoom = useCallback(async (id: string, updates: Partial<Room>) => {
    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setRooms((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (error) {
      console.error('Failed to update room:', error);
    }
  }, []);

  const deleteRoom = useCallback(async (id: string) => {
    try {
      await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  }, []);

  const addStudent = useCallback(async (data: Partial<Student>) => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const newStudent = await res.json();
      setStudents((prev) => [newStudent, ...prev]);
    } catch (error) {
      console.error('Failed to add student:', error);
    }
  }, []);

  const addStudentsBulk = useCallback(async (data: Partial<Student>[]) => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        // Refresh all students since bulk might include updates (upserts)
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to add students in bulk:', error);
    }
  }, [fetchData]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (error) {
      console.error('Failed to update student:', error);
    }
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
      setStudents((prev) => prev.filter((s) => s.id !== id));
      // Also remove student from rooms client-side
      setRooms((prev) =>
        prev.map((room) => ({
          ...room,
          seats: room.seats.map((seat) =>
            seat.studentId === id
              ? { ...seat, studentId: null, status: 'available' as const }
              : seat
          ),
        }))
      );
    } catch (error) {
      console.error('Failed to delete student:', error);
    }
  }, []);

  const deleteAllStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/students', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStudents([]);
        // Clear student assignments from all rooms
        setRooms((prev) =>
          prev.map((room) => ({
            ...room,
            seats: room.seats.map((seat) => ({
              ...seat,
              studentId: null,
              status: 'available' as const,
            })),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to delete all students:', error);
    }
  }, []);


  const allocateSeat = useCallback(async (roomId: string, seatId: string, studentId: string) => {
    try {
      const res = await fetch('/api/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, seatId, studentId }),
      });
      const updatedRoom = await res.json();
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    } catch (error) {
      console.error('Failed to allocate seat:', error);
    }
  }, []);

  const deallocateSeat = useCallback(async (roomId: string, seatId: string) => {
    try {
      const res = await fetch('/api/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, seatId, studentId: null }),
      });
      const updatedRoom = await res.json();
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    } catch (error) {
      console.error('Failed to deallocate seat:', error);
    }
  }, []);

  // Legacy aliases
  const loadFromLocalStorage = fetchData;
  const saveToLocalStorage = () => {}; // no-op: data is persisted via API now
  const allocateStudentToSeat = allocateSeat;
  const deallocateStudentFromSeat = deallocateSeat;
  
  const findStudentSeat = useCallback((query: string) => {
    if (!query) return null;
    const lowerQuery = query.toLowerCase();
    
    // 1. Find the student by roll or reg_no
    const student = students.find(s => 
      s.roll?.toLowerCase() === lowerQuery || 
      s.reg_no?.toLowerCase() === lowerQuery ||
      s.id.toLowerCase() === lowerQuery
    );
    
    if (!student) return null;
    
    // 2. Find the room and seat
    for (const room of rooms) {
      const seat = room.seats.find(s => s.studentId === student.id);
      if (seat) {
        return { room, seat, student };
      }
    }
    
    return null;
  }, [rooms, students]);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      setSchedules(data);
    } catch (err) {
      console.error('Failed to fetch schedules', err);
    }
  }, []);

  const addSchedule = useCallback(async (data: Omit<Schedule, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) fetchSchedules();
    } catch (err) {
      console.error('Failed to add schedule', err);
    }
  }, [fetchSchedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchSchedules();
    } catch (err) {
      console.error('Failed to delete schedule', err);
    }
  }, [fetchSchedules]);

  useEffect(() => {
    fetchData();
    fetchSchedules();
  }, [fetchData, fetchSchedules]);

  const value: AppStateContextType = {
    rooms,
    students,
    loading,
    globalFilters,
    setGlobalFilters,
    resetFilters,
    fetchData,
    addRoom,
    updateRoom,
    deleteRoom,
    addStudent,
    addStudentsBulk,
    updateStudent,
    deleteStudent,
    deleteAllStudents,
    allocateSeat,
    deallocateSeat,
    loadFromLocalStorage,
    saveToLocalStorage,
    allocateStudentToSeat,
    deallocateStudentFromSeat,
    findStudentSeat,
    schedules,
    fetchSchedules,
    addSchedule,
    deleteSchedule,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
