const { MongoClient } = require('mongodb');

async function seed() {
  const uri = "mongodb://localhost:27017/exam_seat_mgmt";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db("exam_seat_mgmt");
    const collection = db.collection("students");

    // Clear existing
    await collection.deleteMany({});
    console.log("Cleared existing students");

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
          totalStudents: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    const result = await collection.insertMany(allStudents);
    console.log(`Successfully seeded ${result.insertedCount} students.`);

  } finally {
    await client.close();
  }
}

seed().catch(console.dir);
