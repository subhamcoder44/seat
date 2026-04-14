const fs = require('fs');
let content = fs.readFileSync('app/seats/manual/page.tsx', 'utf8');

// Name
content = content.replace(/Manual AllocationPage/g, 'PharmacyAllocationPage');
content = content.replace(/ManualAllocationPage/g, 'PharmacyAllocationPage');
content = content.replace(/Manual Seat Allocation System/g, 'Pharmacy Seat Allocation System');
content = content.replace(/Manual control over room-wise department distribution/g, 'College-wise manual control over room distribution for pharmacy students');

// State
content = content.replace(/const \[DEPARTMENTS, setDEPARTMENTS\] = useState<string\[\]>\(\[\]\);\n\n/g, '');
content = content.replace(/const \[deptInputs, setDeptInputs\]/g, 'const [collegeInputs, setCollegeInputs]');
content = content.replace(/deptInputs/g, 'collegeInputs');
content = content.replace(/setDeptInputs/g, 'setCollegeInputs');
content = content.replace(/DEPARTMENTS/g, 'COLLEGES');
content = content.replace(/isLoadingDepts/g, 'isLoadingColleges');
content = content.replace(/setIsLoadingDepts/g, 'setIsLoadingColleges');

// allocations structure
content = content.replace(/allocations: \{\n\s*dept: string;\n\s*students: Student\[\];\n\s*\}\[\];/g, `allocations: { college: string; students: Student[]; }[];`);

// Fetching logic
content = content.replace(/\/\/ Fetch distinct departments from DB[\s\S]*?\.finally\(\(\) => setIsLoadingColleges\(false\)\);/g, `setIsLoadingColleges(false);`);

content = content.replace(/const availableStudentsByDept = useMemo/g, `
  const COLLEGES = useMemo(() => {
    const colleges = new Set(students.map(s => s.inst_name).filter(Boolean));
    return Array.from(colleges).sort();
  }, [students]);

  useEffect(() => {
    setCollegeInputs(prev => {
      const next = { ...prev };
      COLLEGES.forEach(c => { if (next[c] === undefined) next[c] = 0; });
      return next;
    });
  }, [COLLEGES]);

  const availableStudentsByCollege = useMemo`);

content = content.replace(/availableStudentsByDept/g, 'availableStudentsByCollege');

// Grouping
content = content.replace(/const dept = \(s as any\)\.department \|\| '';/g, `const college = (s as any).inst_name || '';`);
content = content.replace(/COLLEGES\.includes\(dept\)/g, `COLLEGES.includes(college)`);
content = content.replace(/if \(\!map\.has\(dept\)\) map\.set\(dept, \[\]\);/g, `if (!map.has(college)) map.set(college, []);`);
content = content.replace(/map\.get\(dept\)\?\.push\(s\);/g, `map.get(college)?.push(s);`);
content = content.replace(/if \(dept &&/g, `if (college &&`);
content = content.replace(/COLLEGES\.forEach\(dept => map\.set\(college, \[\]\)\);/g, `COLLEGES.forEach(c => map.set(c, []));`);
content = content.replace(/COLLEGES\.forEach\(dept => map\.set\(dept, \[\]\)\);/g, `COLLEGES.forEach(c => map.set(c, []));`);
content = content.replace(/collegeInputs\[dept\]/g, `collegeInputs[college]`);
content = content.replace(/handleDeptInputChange/g, 'handleCollegeInputChange');
content = content.replace(/\(dept: string, value: string\)/g, `(college: string, value: string)`);

// Loops
content = content.replace(/for \(const dept of COLLEGES/g, `for (const college of COLLEGES`);
content = content.replace(/newInputs\[dept\]/g, `newInputs[college]`);
content = content.replace(/const available = availableStudentsByCollege\.get\(dept\)/g, `const available = availableStudentsByCollege.get(college)`);
content = content.replace(/COLLEGES\.forEach\(dept => \{/g, `COLLEGES.forEach(college => {`);
content = content.replace(/const count = collegeInputs\[dept\];/g, `const count = collegeInputs[college];`);
content = content.replace(/studentList\.slice\(0, count\)/g, `studentList.slice(0, count)`);
content = content.replace(/newAllocations\.push\(\{\n\s*dept,\n\s*students: selected\n\s*\}\);/g, `newAllocations.push({ college, students: selected });`);

// Layout Arrays
content = content.replace(/const deptQueues = newAllocations\.map\(a => \(\{ dept: a\.dept, q: \[\.\.\.a\.students\] \}\)\);/g, `const collegeQueues = newAllocations.map(a => ({ college: a.college, q: [...a.students] }));`);
content = content.replace(/deptQueues/g, 'collegeQueues');
content = content.replace(/forbiddenDepts\.has\(dq\.dept\)/g, `forbiddenColleges.has(dq.college)`);
content = content.replace(/forbiddenDepts/g, 'forbiddenColleges');
content = content.replace(/n!\.department/g, `n!.inst_name`);

// Persistence ID
content = content.replace(/manual_room_allocations/g, 'pharmacy_room_allocations');
content = content.replace(/manual_allocated_student_ids/g, 'pharmacy_allocated_ids');
content = content.replace(/setCollegeInputs\(Object\.fromEntries\(COLLEGES\.map\(d => \[d, 0\]\)\)\);/g, `setCollegeInputs(Object.fromEntries(COLLEGES.map(c => [c, 0])));`);

// Colors
content = content.replace(/const DEPT_PDF_COLORS: Record<string, \[number, number, number\]>[\s\S]*?const DEPT_PDF_COLORS_DEFAULT: \[number, number, number\] = \[198, 239, 206\]; \/\/ Light Green for others\n\n  const getDeptColor = \(dept: string\): \[number, number, number\] => \{\n    return DEPT_PDF_COLORS\[dept\] \?\? DEPT_PDF_COLORS_DEFAULT;\n  \};\n/g, `const COLLEGE_PDF_PALETTE: [number, number, number][] = [
    [173, 216, 230], [255, 200, 120], [255, 182, 193], [216, 191, 216],
    [152, 251, 152], [255, 250, 205], [240, 128, 128], [176, 224, 230]
  ];
  const getCollegeColor = (college: string): [number, number, number] => {
    let hash = 0;
    college = college || '';
    for (let i = 0; i < college.length; i++) hash = college.charCodeAt(i) + ((hash << 5) - hash);
    return COLLEGE_PDF_PALETTE[Math.abs(hash) % COLLEGE_PDF_PALETTE.length];
  };
`);

content = content.replace(/getBranchName/g, 'getCollegeName');
content = content.replace(/const getCollegeName = \(dept: string\) => \{[\s\S]*?return mapping\[dept\] \|\| dept;\n  \};/g, 'const getCollegeName = (college: string) => college;');

content = content.replace(/getDeptColor\(leftStudent\.department\)/g, `getCollegeColor(leftStudent.inst_name)`);
content = content.replace(/getDeptColor\(rightStudent\.department\)/g, `getCollegeColor(rightStudent.inst_name)`);
content = content.replace(/getDeptColor\(uniqueDeptsInAisle\[0\]\)/g, `getCollegeColor(uniqueDeptsInAisle[0])`);
content = content.replace(/getDeptColor/g, `getCollegeColor`);

content = content.replace(/uniqueDeptsInAisle\.map\(d => getCollegeName\(d\)\)\.join\(' & '\)/g, `uniqueDeptsInAisle.join(' & ')`);
content = content.replace(/allDeptsInRoom\.map\(d => \`\$\{d\}: \$\{getCollegeName\(d\)\}\`\)/g, `allCollegesInRoom`);
content = content.replace(/allDeptsInRoom\.forEach\(dept => /g, `allCollegesInRoom.forEach(college => `);
content = content.replace(/getCollegeColor\(dept\)/g, `getCollegeColor(college)`);
content = content.replace(/\`\$\{dept\}: \$\{getCollegeName\(dept\)\}\`/g, `college`);

content = content.replace(/leftStudent\?\.department/g, `leftStudent?.inst_name`);
content = content.replace(/rightStudent\?\.department/g, `rightStudent?.inst_name`);

// UI Fixes
content = content.replace(/Department Selection/g, 'College Target Selection');
content = content.replace(/Loading departments from database\.\.\./g, 'Loading colleges from database...');
content = content.replace(/No departments found/g, 'No colleges found');
content = content.replace(/dept=/g, 'college=');
content = content.replace(/\{dept\}/g, '{college}');
content = content.replace(/key=\{dept\}/g, 'key={college}');
content = content.replace(/COLLEGES\.map\(\(dept\)/g, 'COLLEGES.map((college)');
content = content.replace(/a\.dept/g, 'a.college');
content = content.replace(/alloc\.dept/g, 'alloc.college');
content = content.replace(/key=\{alloc\.dept\}/g, 'key={alloc.college}');
content = content.replace(/setCollegeInputs\(all\);/g, 'setCollegeInputs(all as any);');
content = content.replace(/\[dept\]: isActive/g, '[college]: isActive');
content = content.replace(/handleCollegeInputChange\(dept, e\.target\.value\)/g, 'handleCollegeInputChange(college, e.target.value)');

content = content.replace(/idx % 4 === 0 \? 'bg-blue-500'/g, `d === 'DCST' ? 'bg-blue-500'`); // undo accidental replace? Actually wait. The original manual used static assignments. We will apply hash.
content = content.replace(/d === 'DCST' \? 'bg-blue-500' :[\s\S]*?d === 'DME' \? 'bg-orange-500' : 'bg-emerald-500'/g, `COLLEGES.indexOf(d) % 4 === 0 ? 'bg-blue-500' : COLLEGES.indexOf(d) % 4 === 1 ? 'bg-purple-500' : COLLEGES.indexOf(d) % 4 === 2 ? 'bg-orange-500' : 'bg-emerald-500'`);
content = content.replace(/COLLEGES\.map\(d => \(/g, `COLLEGES.slice(0, 8).map((d) => (`);

content = content.replace(/bench\.left\.department === 'DCST' \? 'bg-blue-500' :[\s\S]*?bench\.left\.department === 'DME' \? 'bg-orange-500' : 'bg-emerald-500'/g, `COLLEGES.indexOf(bench.left.inst_name) % 4 === 0 ? 'bg-blue-500' : COLLEGES.indexOf(bench.left.inst_name) % 4 === 1 ? 'bg-purple-500' : COLLEGES.indexOf(bench.left.inst_name) % 4 === 2 ? 'bg-orange-500' : 'bg-emerald-500'`);
content = content.replace(/bench\.right\.department === 'DCST' \? 'bg-blue-500' :[\s\S]*?bench\.right\.department === 'DME' \? 'bg-orange-500' : 'bg-emerald-500'/g, `COLLEGES.indexOf(bench.right.inst_name) % 4 === 0 ? 'bg-blue-500' : COLLEGES.indexOf(bench.right.inst_name) % 4 === 1 ? 'bg-purple-500' : COLLEGES.indexOf(bench.right.inst_name) % 4 === 2 ? 'bg-orange-500' : 'bg-emerald-500'`);

// Any remaining "dept" variable names inside templates
content = content.replace(/uniqueDeptsInAisle/g, 'uniqueCollegesInAisle');
content = content.replace(/allDeptsInRoom/g, 'allCollegesInRoom');
content = content.replace(/uniqueDepts/g, 'uniqueColleges');

fs.writeFileSync('app/pharmacy/page.tsx', content);
console.log('Pharmacy rebuilt correctly');
