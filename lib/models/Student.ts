import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface IStudent extends Document {
  name: string; // Used for Student Name
  email: string; // Used for Exam Target
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
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    rollRangeStart: { type: String, default: '' },
    rollRangeEnd: { type: String, default: '' },
    totalStudents: { type: Number, default: 0 },
    seatingPlan: { 
      type: String, 
      enum: ['Planned', 'Pending', 'Not Started', 'In Progress', 'Just Uploaded'],
      default: 'Not Started'
    },
    reg_no: { type: String, default: '' },
    roll: { type: String, default: '' },
    no: { type: String, default: '' },
    sem: { type: String, default: '' },
    type: { type: String, default: '' },
    inst_id: { type: String, default: '' },
    inst_name: { type: String, default: '' },
    exam_centre_code: { type: String, default: '' },
    exam_centre_name: { type: String, default: '' },
    department: { type: String, default: '' },
  },
  { timestamps: true }
);

// Standard Next.js mongoose caching pattern
const Student = (models.Student as mongoose.Model<IStudent>) || model<IStudent>('Student', StudentSchema);
export default Student;
