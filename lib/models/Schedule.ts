import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface ISchedule extends Document {
  date: string;
  time: string;
  semesters: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleSchema = new Schema<ISchedule>(
  {
    date: { type: String, required: true },
    time: { type: String, required: true },
    semesters: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Schedule = (models.Schedule as mongoose.Model<ISchedule>) || model<ISchedule>('Schedule', ScheduleSchema);
export default Schedule;
