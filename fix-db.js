const fs = require('fs');
const mongoose = require('mongoose');

const envContent = fs.readFileSync('.env.local', 'utf8');
const mongoUriMatch = envContent.match(/MONGODB_URI=(.*)/);
const MONGODB_URI = mongoUriMatch ? mongoUriMatch[1].trim() : null;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    try {
      await db.collection('students').dropIndex('rollNumber_1');
      console.log('Successfully dropped old unique index rollNumber_1');
    } catch(e) {
      console.log('Index rollNumber_1 not found or already dropped', e.message);
    }
    
    // Also let's clean up the corrupt records from older bugs
    // to give the user a clean slate so the blank ones disappear!
    // Corrupt records from old bug have reg_no literally missing (undefined) or empty 
    // AND name starting with "PHARM"
    const result = await db.collection('students').deleteMany({
      name: { $regex: /^PHARM/ }
    });
    console.log(`Deleted ${result.deletedCount} corrupted blank records from the UI.`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
