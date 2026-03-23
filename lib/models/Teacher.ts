import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface ITeacher extends Document {
  email: string;
  name: string;
  password: string;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const Teacher = models.Teacher || model<ITeacher>('Teacher', TeacherSchema);
export default Teacher;
