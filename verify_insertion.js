const fs = require('fs');
const mongoose = require('mongoose');

const envContent = fs.readFileSync('.env.local', 'utf8');
const mongoUriMatch = envContent.match(/MONGODB_URI=(.*)/);
const MONGODB_URI = mongoUriMatch ? mongoUriMatch[1].trim() : null;

async function verify() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }
  
  try {
    await mongoose.connect(MONGODB_URI);
    const StudentSchema = new mongoose.Schema({}, { strict: false });
    const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

    const ids = [
      "69c01d20e8d3496a1e595be5",
      "69c01d20e8d3496a1e595be7",
      "69c01d20e8d3496a1e595be9",
      "69c01d20e8d3496a1e595beb"
    ];

    const count = await Student.countDocuments({ _id: { $in: ids } });
    console.log(`Found ${count} out of 4 added students.`);

    const found = await Student.find({ _id: { $in: ids } }, { name: 1, roll: 1 });
    found.forEach(s => console.log(` - ${s.name} (${s.roll})`));

    process.exit(0);
  } catch (error) {
    console.error('Error verifying students:', error);
    process.exit(1);
  }
}

verify();
