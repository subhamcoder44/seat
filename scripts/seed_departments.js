const mongoose = require('mongoose');

// Define Schema (Simplified for seeding)
const StudentSchema = new mongoose.Schema({
  name: String,
  email: String,
  reg_no: String,
  roll: String,
  department: String,
  totalStudents: { type: Number, default: 1 },
});

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

async function seed() {
  const MONGODB_URI = "mongodb://localhost:27017/exam_seat_mgmt"; 
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const departments = ['DCST', 'DME', 'DCE', 'DEE'];
    const studentsPerDept = 50;
    const allStudents = [];

    for (const dept of departments) {
      for (let i = 1; i <= studentsPerDept; i++) {
        allStudents.push({
          name: `${dept} Student ${i}`,
          email: `${dept.toLowerCase()}${i}@example.com`,
          reg_no: `${dept}${2024000 + i}`,
          roll: `${dept}-${i.toString().padStart(3, '0')}`,
          department: dept,
          totalStudents: 1
        });
      }
    }

    // Clear existing students if you want a fresh start, or just add
    // await Student.deleteMany({}); 
    
    await Student.insertMany(allStudents);
    console.log(`Successfully seeded ${allStudents.length} students across 4 departments.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
