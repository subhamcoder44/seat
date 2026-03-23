import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface ISeat {
  id: string;
  row: number;
  column: number;
  studentId: string | null;
  status: 'available' | 'occupied' | 'blocked';
}

export interface IRoom extends Document {
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
  seats: ISeat[];
  createdAt: Date;
}

const SeatSchema = new Schema<ISeat>(
  {
    id: { type: String, required: true },
    row: { type: Number, required: true },
    column: { type: Number, required: true },
    studentId: { type: String, default: null },
    status: { type: String, enum: ['available', 'occupied', 'blocked'], default: 'available' },
  },
  { _id: false }
);

const RoomSchema = new Schema<IRoom>(
  {
    name: { type: String, required: true },
    building: { type: String, default: 'A' },
    floor: { type: Number, default: 1 },
    totalCapacity: { type: Number, default: 30 },
    roomType: { type: String, enum: ['Standard', 'Classroom', 'Lecture Hall', 'Lab'], default: 'Standard' },
    rows: { type: Number, required: true },
    columns: { type: Number, required: true },
    doorPosition: { type: String, enum: ['left', 'right', 'top', 'bottom'], default: 'left' },
    status: { type: String, enum: ['Available', 'In Use', 'Inactive'], default: 'Available' },
    currentPlan: { type: String, default: 'No Plan' },
    seats: { type: [SeatSchema], default: [] },
  },
  { timestamps: true }
);

const Room = models.Room || model<IRoom>('Room', RoomSchema);
export default Room;
