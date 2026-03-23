'use client';

import { useState } from 'react';
import { Student } from '@/hooks/use-app-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from 'sonner';

interface StudentFormProps {
  student?: Student;
  onSubmit: (data: { name: string; rollNumber: string; email: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function StudentForm({ student, onSubmit, onCancel, isLoading = false }: StudentFormProps) {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    rollNumber: student?.roll || '',
    email: student?.email || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Student name is required');
      return;
    }

    if (!formData.rollNumber.trim()) {
      toast.error('Roll number is required');
      return;
    }

    onSubmit(formData);
    setFormData({ name: '', rollNumber: '', email: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field>
        <FieldLabel htmlFor="name">Student Name</FieldLabel>
        <Input
          id="name"
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="rollNumber">Roll Number</FieldLabel>
        <Input
          id="rollNumber"
          placeholder="2024001"
          value={formData.rollNumber}
          onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="email">Email (Optional)</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="student@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </Field>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : student ? 'Update Student' : 'Add Student'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
