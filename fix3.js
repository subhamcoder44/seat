const fs = require('fs');
let content = fs.readFileSync('app/pharmacy/page.tsx', 'utf8');

// Fix RoomAllocation type
content = content.replace(/allocations: \{\n\s*dept: string;\n\s*students: Student\[\];\n\s*\}\[\];/g, 'allocations: { college: string; students: Student[]; }[];');

content = content.replace(/dept: string;/g, 'college: string;');

// Fix array accesses
content = content.replace(/\[dept\]/g, '[college]');
content = content.replace(/collegeInputs\[dept\]/g, 'collegeInputs[college]');
content = content.replace(/availableStudentsByCollege\.get\(dept\)/g, 'availableStudentsByCollege.get(college)');

// Fix object definitions
content = content.replace(/\(dept,/g, '(college,');
content = content.replace(/dept,/g, 'college,');
content = content.replace(/\{ dept: a\.college/g, '{ college: a.college');

// Fix property accesses
content = content.replace(/a\.dept/g, 'a.college');
content = content.replace(/alloc\.dept/g, 'alloc.college');

fs.writeFileSync('app/pharmacy/page.tsx', content);
