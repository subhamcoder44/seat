const mongoose = require('mongoose');

async function check() {
  const MONGODB_URI = "mongodb://localhost:27017/exam_seat_mgmt"; 
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const StudentSchema = new mongoose.Schema({}, { strict: false });
    const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

    const count = await Student.countDocuments();
    console.log(`Total Students: ${count}`);

    const sample = await Student.findOne({ department: { $ne: '' } });
    console.log('Sample Department Student:', sample);

    const depts = await Student.distinct('department');
    console.log('Distinct Departments:', depts);

    process.exit(0);
  } catch (error) {
    console.error('Error checking data:', error);
    process.exit(1);
  }
}

check();
