const fs = require('fs');

let content = fs.readFileSync('app/pharmacy/page.tsx', 'utf8');

content = content.replace(/dept: string;/g, 'college: string;');
content = content.replace(/\[dept\]: num/g, '[college]: num');
content = content.replace(/collegeInputs\[dept\]/g, 'collegeInputs[college]');
content = content.replace(/availableStudentsByCollege\.get\(dept\)/g, 'availableStudentsByCollege.get(college)');
content = content.replace(/dept,\n\s*students: selected/g, 'college,\n          students: selected');
content = content.replace(/\{ dept: a\.college, q: /g, '{ college: a.college, q: ');
content = content.replace(/const getBranchName = \(dept: string\) => \{[\s\S]*?return mapping\[dept\] \|\| dept;\n\s*\};/g, 'const getBranchName = (college: string) => college;');
content = content.replace(/const getCollegeColor = \(dept: string\): \[number, number, number\] => \{[\s\S]*?return DEPT_PDF_COLORS\[dept\] \?\? DEPT_PDF_COLORS_DEFAULT;\n\s*\};/g, `const COLLEGE_PDF_PALETTE: [number, number, number][] = [
    [173, 216, 230], [255, 200, 120], [255, 182, 193], [216, 191, 216],
    [152, 251, 152], [255, 250, 205], [240, 128, 128], [176, 224, 230]
  ];
  const getCollegeColor = (college: string): [number, number, number] => {
    // Generate a consistent pseudo-random color based on string hash if we want, OR just a fallback.
    // For simplicity, we just hash the string and pick from palette.
    let hash = 0;
    for (let i = 0; i < college.length; i++) hash = college.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % COLLEGE_PDF_PALETTE.length;
    return COLLEGE_PDF_PALETTE[index];
  };`);
content = content.replace(/per-dept color/g, 'per-college color');
content = content.replace(/single dept/g, 'single college');
content = content.replace(/allDeptsInRoom\.forEach\(dept => \{/g, 'allCollegesInRoom.forEach(college => {');
content = content.replace(/getCollegeColor\(dept\)/g, 'getCollegeColor(college)');
content = content.replace(/\`\$\{college\}: \$\{getBranchName\(dept\)\}\`/g, '\`${college}\`');
content = content.replace(/\[dept\]: isActive/g, '[college]: isActive');
content = content.replace(/handleCollegeInputChange\(dept, e\.target\.value\)/g, 'handleCollegeInputChange(college, e.target.value)');
content = content.replace(/alloc\.dept/g, 'alloc.college');

// Ensure PDF dynamic color receives 1 parameter where there are 2:
content = content.replace(/getCollegeColor\(leftStudent\.inst_name, uniqueDepts\)/g, 'getCollegeColor(leftStudent.inst_name)');
content = content.replace(/getCollegeColor\(rightStudent\.inst_name, uniqueDepts\)/g, 'getCollegeColor(rightStudent.inst_name)');
content = content.replace(/getCollegeColor\(uniqueDeptsInAisle\[0\], uniqueDepts\)/g, 'getCollegeColor(uniqueDeptsInAisle[0])');

fs.writeFileSync('app/pharmacy/page.tsx', content);
