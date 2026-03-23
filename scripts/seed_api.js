const departments = ['DCST', 'DME', 'DCE', 'DEE'];
const studentsPerDept = 50;
const students = [];

for (const dept of departments) {
  for (let i = 1; i <= studentsPerDept; i++) {
    students.push({
      name: `${dept} Student ${i}`,
      email: `${dept.toLowerCase()}${i}@example.com`,
      reg_no: `${dept}${2024000 + i}`,
      roll: `${dept}-${i.toString().padStart(3, '0')}`,
      department: dept,
      totalStudents: 1,
      no: (1000 + i).toString(),
      sem: '1',
      type: 'regular',
      inst_id: 'POLY',
      inst_name: 'Polytechnic College',
      exam_centre_code: 'BPC',
      exam_centre_name: 'Bipradas Pal Chowdhury Institute of Technology'
    });
  }
}

async function addStudents() {
  console.log(`Starting to seed ${students.length} students...`);
  for (const student of students) {
    try {
      const res = await fetch('http://localhost:3000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      });
      if (!res.ok) {
        console.error(`Failed to add ${student.name}:`, await res.text());
      } else {
        // console.log(`Added ${student.name}`);
      }
    } catch (e) {
      console.error(`Error adding ${student.name}:`, e.message);
    }
  }
  console.log('Seeding complete.');
}

addStudents();
