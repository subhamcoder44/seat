const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read MONGODB_URI from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const mongoUriMatch = envContent.match(/MONGODB_URI=(.*)/);
const MONGODB_URI = mongoUriMatch ? mongoUriMatch[1].trim() : null;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Inline schemas for the script to avoid TS/ESM issues
const SeatSchema = new mongoose.Schema({
  id: String,
  row: Number,
  column: Number,
  studentId: String,
  status: String
}, { _id: false });

const RoomSchema = new mongoose.Schema({
  name: String,
  building: String,
  floor: Number,
  totalCapacity: Number,
  roomType: String,
  rows: Number,
  columns: Number,
  doorPosition: String,
  status: String,
  currentPlan: String,
  seats: [SeatSchema]
}, { timestamps: true });

const StudentSchema = new mongoose.Schema({
  name: String,
  email: String,
  rollRangeStart: String,
  rollRangeEnd: String,
  totalStudents: Number,
  seatingPlan: String,
  reg_no: String,
  roll: String,
  no: String,
  sem: String,
  type: String,
  inst_id: String,
  inst_name: String,
  exam_centre_code: String,
  exam_centre_name: String
}, { timestamps: true });

const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Create a sample student
    const studentData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      reg_no: 'REG123456',
      roll: 'ROLL123',
      sem: 'Semester 4 - CSE',
      type: 'Regular'
    };

    let student = await Student.findOne({ roll: 'ROLL123' });
    if (!student) {
      student = await Student.create(studentData);
      console.log('Created student:', student.name);
    } else {
      console.log('Student ROLL123 already exists');
    }

    // 2. Create a sample room and allocate the student
    const roomId = 'room-101';
    let room = await Room.findOne({ name: 'Room 101' });
    
    const rows = 5;
    const cols = 6;
    const seats = [];
    
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const isTarget = (r === 2 && c === 3); // Allocate to Row 2, Seat 3
        seats.push({
          id: `s-${r}-${c}`,
          row: r,
          column: c,
          studentId: isTarget ? student._id.toString() : null,
          status: isTarget ? 'occupied' : 'available'
        });
      }
    }

    if (!room) {
      room = await Room.create({
        name: 'Room 101',
        building: 'Science Block',
        floor: 1,
        totalCapacity: rows * cols,
        roomType: 'Standard',
        rows,
        columns: cols,
        doorPosition: 'left',
        status: 'Available',
        currentPlan: 'Sample Plan',
        seats
      });
      console.log('Created room:', room.name);
    } else {
      // Update existing room with the allocation if not already allocated
      const alreadyAllocated = room.seats.some(s => s.studentId === student._id.toString());
      if (!alreadyAllocated) {
        room.seats = seats;
        await room.save();
        console.log('Updated room with allocation for ROLL123');
      } else {
        console.log('Room 101 already has allocation for ROLL123');
      }
    }

    console.log('Seeding complete! You can now search for ROLL123 or REG123456');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
