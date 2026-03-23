'use client';

import { ExamRoom, Seat } from '@/hooks/use-app-state';
import { Student } from '@/hooks/use-app-state';
import { useState } from 'react';

interface SeatGridProps {
  room: ExamRoom;
  students: Student[];
  onAllocate: (seatId: string, studentId: string) => void;
  onDeallocate: (seatId: string) => void;
}

export function SeatGrid({
  room,
  students,
  onAllocate,
  onDeallocate,
}: SeatGridProps) {
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

  const handleSeatClick = (seat: Seat) => {
    if (seat.studentId) {
      onDeallocate(seat.id);
    } else {
      setSelectedSeat(selectedSeat === seat.id ? null : seat.id);
    }
  };

  const handleStudentDragStart = (studentId: string) => {
    setDraggedStudentId(studentId);
  };

  const handleSeatDrop = (seatId: string) => {
    if (draggedStudentId) {
      onAllocate(seatId, draggedStudentId);
      setDraggedStudentId(null);
      setSelectedSeat(null);
    }
  };

  const allocatedStudentIds = new Set(room.seats.map(s => s.studentId).filter(Boolean));
  const unallocatedStudents = students.filter(s => !allocatedStudentIds.has(s.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Seat Grid */}
      <div className="lg:col-span-2">
        <div className="bg-secondary p-8 rounded-lg">
          <div
            className="inline-grid gap-2 p-4 bg-background rounded-lg border border-border"
            style={{
              gridTemplateColumns: `repeat(${room.columns}, minmax(0, 1fr))`,
            }}
          >
            {room.seats.map((seat) => {
              const student = students.find(s => s.id === seat.studentId);
              const isSelected = selectedSeat === seat.id;
              const isOccupied = !!seat.studentId;

              return (
                <button
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleSeatDrop(seat.id)}
                  className={`aspect-square p-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center border ${
                    isOccupied
                      ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
                      : isSelected
                        ? 'bg-accent border-accent text-accent-foreground'
                        : 'bg-card border-border hover:bg-secondary'
                  }`}
                  title={
                    isOccupied
                      ? `${seat.id}: ${student?.name} (${student?.roll})`
                      : `${seat.id}: Available`
                  }
                >
                  <span className="break-words">{student?.roll || seat.id.split('_')[1]}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-card border border-border rounded" />
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-accent border border-accent rounded" />
              <span className="text-muted-foreground">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary border border-primary rounded" />
              <span className="text-muted-foreground">Occupied</span>
            </div>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Unallocated Students</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {unallocatedStudents.length === 0 ? (
            <div className="p-4 bg-secondary rounded-lg text-center text-muted-foreground text-sm">
              All students allocated!
            </div>
          ) : (
            unallocatedStudents.map((student) => (
              <div
                key={student.id}
                draggable
                onDragStart={() => handleStudentDragStart(student.id)}
                className="p-3 bg-secondary rounded-lg cursor-move hover:bg-secondary border border-border transition-colors"
              >
                <p className="font-semibold text-sm text-foreground">{student.name}</p>
                <p className="text-xs text-muted-foreground">{student.roll}</p>
              </div>
            ))
          )}
        </div>

        {unallocatedStudents.length > 0 && (
          <p className="text-xs text-muted-foreground p-3 bg-secondary rounded-lg">
            Drag students to seats or click seat then select student
          </p>
        )}
      </div>
    </div>
  );
}
