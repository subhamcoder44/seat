'use client';

import { useState } from 'react';
import { ExamRoom } from '@/hooks/use-app-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from 'sonner';

interface RoomFormProps {
  room?: ExamRoom;
  onSubmit: (data: { name: string; rows: number; columns: number }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RoomForm({ room, onSubmit, onCancel, isLoading = false }: RoomFormProps) {
  const [formData, setFormData] = useState({
    name: room?.name || '',
    rows: room?.rows || 5,
    columns: room?.columns || 10,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Room name is required');
      return;
    }

    if (formData.rows < 1 || formData.columns < 1) {
      toast.error('Rows and columns must be at least 1');
      return;
    }

    if (formData.rows * formData.columns > 500) {
      toast.error('Maximum 500 seats per room');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field>
        <FieldLabel htmlFor="name">Room Name</FieldLabel>
        <Input
          id="name"
          placeholder="e.g., Hall A, Lab 1"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="rows">Rows</FieldLabel>
          <Input
            id="rows"
            type="number"
            min="1"
            max="50"
            value={formData.rows}
            onChange={(e) =>
              setFormData({ ...formData, rows: Math.max(1, parseInt(e.target.value) || 1) })
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="columns">Columns</FieldLabel>
          <Input
            id="columns"
            type="number"
            min="1"
            max="50"
            value={formData.columns}
            onChange={(e) =>
              setFormData({
                ...formData,
                columns: Math.max(1, parseInt(e.target.value) || 1),
              })
            }
          />
        </Field>
      </div>

      <div className="bg-secondary p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Total seats: <span className="font-semibold text-foreground">{formData.rows * formData.columns}</span>
        </p>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : room ? 'Update Room' : 'Create Room'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
