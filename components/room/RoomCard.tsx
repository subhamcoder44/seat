'use client';

import { ExamRoom } from '@/hooks/use-app-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DoorOpen, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface RoomCardProps {
  room: ExamRoom;
  onDelete: (id: string) => void;
  onEdit: (room: ExamRoom) => void;
}

export function RoomCard({ room, onDelete, onEdit }: RoomCardProps) {
  const occupiedSeats = room.seats.filter(s => s.studentId).length;
  const occupancyPercent = Math.round((occupiedSeats / room.seats.length) * 100);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <DoorOpen className="text-primary" size={24} />
            <div>
              <h3 className="font-bold text-lg text-foreground">{room.name}</h3>
              <p className="text-sm text-muted-foreground">
                {room.rows} × {room.columns} seats
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Occupancy</span>
            <span className="font-semibold text-foreground">
              {occupiedSeats}/{room.seats.length} ({occupancyPercent}%)
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Link href={`/seats?room=${room.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Allocate
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(room)}
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(room.id)}
          >
            <Trash2 size={16} className="text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
