const fs = require('fs');
const mongoose = require('mongoose');
const students = require('./student.js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const mongoUriMatch = envContent.match(/MONGODB_URI=(.*)/);
const MONGODB_URI = mongoUriMatch ? mongoUriMatch[1].trim() : null;

async function addStudents() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop collection for a clean start
    try {
      await mongoose.connection.db.collection('students').drop();
      console.log('Dropped existing students collection');
    } catch (e) {
      console.log('Collection students did not exist, skipping drop');
    }

    const StudentSchema = new mongoose.Schema({}, { strict: false });
    const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

    console.log(`Attempting to add ${students.length} students...`);

    for (const studentData of students) {
      // Use upsert to avoid duplicates by roll number
      await Student.findOneAndUpdate(
        { roll: studentData.roll },
        { $set: studentData },
        { upsert: true, new: true }
      );
      // console.log(`Processed: ${studentData.name} (${studentData.roll})`);
    }

    console.log('All students processed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error adding students:', error);
    process.exit(1);
  }
}

addStudents();
