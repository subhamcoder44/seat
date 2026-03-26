const departments = ['DCE', 'DCST', 'DEE', 'DME'];
const students = [];

for (const dept of departments) {
  for (let i = 1; i <= 50; i++) {
    const idNum = String(i).padStart(3, '0');
    const slNo = 1000 + i + (departments.indexOf(dept) * 100);
    
    students.push({
      name: `${dept} Student ${i}`,
      email: `${dept.toLowerCase()}${i}@example.com`,
      rollRangeStart: "",
      rollRangeEnd: "",
      totalStudents: 1,
      seatingPlan: "Not Started",
      reg_no: `${dept}2024${idNum}`,
      roll: `${dept}-${idNum}`,
      no: String(slNo),
      sem: "1",
      type: "regular",
      inst_id: "POLY",
      inst_name: "Polytechnic College",
      exam_centre_code: "BPC",
      exam_centre_name: "Bipradas Pal Chowdhury Institute of Technology",
      department: dept
    });
  }
}

module.exports = students;
