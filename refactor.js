const fs = require('fs');

let content = fs.readFileSync('app/pharmacy/page.tsx', 'utf8');

// 1. Color palette updates
content = content.replace(
  /const DEPT_PDF_COLORS.*?DEPT_PDF_DEFAULT;/s,
  `const COLLEGE_PDF_PALETTE: [number, number, number][] = [
  [173, 216, 230], [255, 200, 120], [255, 182, 193], [216, 191, 216],
  [152, 251, 152], [255, 250, 205], [240, 128, 128], [176, 224, 230],
];

const getCollegeColor = (college: string, allCollegesForRoom: string[]): [number, number, number] => {
  const idx = allCollegesForRoom.indexOf(college);
  if (idx === -1) return [198, 239, 206];
  return COLLEGE_PDF_PALETTE[idx % COLLEGE_PDF_PALETTE.length];
};`
);

content = content.replace(
  /const getDeptColor[\s\S]*?(?=const getBranchName)/s,
  ``
);

content = content.replace(
  /const getBranchName[\s\S]*?return map\[dept\] \|\| dept;\n};\n/s,
  `const getBranchName = (college: string) => college;\n`
);

// 2. RoomAllocation definition
content = content.replace(
  /allocations: \{\n\s*dept: string;\n\s*students: Student\[\];\n\s*\}\[\];/g,
  `allocations: {
    college: string;
    students: Student[];
  }[];`
);

// 3. State replacements
content = content.replace(
  /const \[DEPARTMENTS, setDEPARTMENTS\] = useState<string\[\]>\(\[\]\);\n\s*const \[deptInputs, setDeptInputs\] = useState<Record<string, number>>\(\{\}\);\n\s*const \[isLoadingDepts, setIsLoadingDepts\] = useState\(true\);/g,
  `const [collegeInputs, setCollegeInputs] = useState<Record<string, number>>({});`
);

// 4. Fetching logic in bootstrap useEffect
content = content.replace(
  /\/\/ Fetch departments from DB[\s\S]*?\.finally\(\(\) => setIsLoadingDepts\(false\)\);/g,
  `// Target counts are purely driven by selected colleges now.`
);

// 5. Toggle college hook logic
content = content.replace(
  /setDeptInputs\(Object\.fromEntries\(DEPARTMENTS\.map\(d => \[d, 0\]\)\)\);/g,
  `setCollegeInputs(Object.fromEntries(Array.from(next).map(c => [c, 0])));`
);
content = content.replace(
  /setDeptInputs\(Object\.fromEntries\(DEPARTMENTS\.map\(d => \[d, 0\]\)\)\);/g,
  `setCollegeInputs(Object.fromEntries(Array.from(selectedColleges).map(c => [c, 0])));` // toggle part
);
// replace multiple occurrences if needed
content = content.replace(/setDeptInputs/g, 'setCollegeInputs');
content = content.replace(/deptInputs/g, 'collegeInputs');

// 6. Handle input change
content = content.replace(
  /const handleDeptInputChange = \(dept: string, value: string\) => \{/g,
  `const handleCollegeInputChange = (college: string, value: string) => {`
);

// 7. availableStudentsByDept to availableStudentsByCollege
content = content.replace(
  /availableStudentsByDept/g,
  'availableStudentsByCollege'
);
content = content.replace(
  /DEPARTMENTS\.forEach\(d => map\.set\(d, \[\]\)\);[\s\S]*?if \(!map\.has\(dept\)\) map\.set\(dept, \[\]\);[\s\S]*?map\.get\(dept\)!\.push\(s\);[\s\S]*?\}\);/s,
  `Array.from(selectedColleges).forEach(c => map.set(c, []));
    filteredStudents.forEach(s => {
      const college = s.inst_name || '';
      if (college && selectedColleges.has(college)) {
        if (!map.has(college)) map.set(college, []);
        map.get(college)!.push(s);
      }
    });`
);

// 8. AutoFill logic
content = content.replace(
  /for \(const dept of DEPARTMENTS\) \{[\s\S]*?const available = availableStudentsByCollege\.get\(dept\)\?\.length \|\| 0;[\s\S]*?const alreadySelected = newInputs\[dept\];[\s\S]*?newInputs\[dept\] \+= canAdd;[\s\S]*?if \(remaining <= 0\) break;\n\s*\}/s,
  `for (const college of Array.from(selectedColleges)) {
      const available = availableStudentsByCollege.get(college)?.length || 0;
      const alreadySelected = newInputs[college];
      const canAdd = Math.min(available - alreadySelected, remaining);
      if (canAdd > 0) {
        newInputs[college] += canAdd;
        remaining -= canAdd;
      }
      if (remaining <= 0) break;
    }`
);

// 9. Validation and building new allocations
content = content.replace(
  /for \(const dept of DEPARTMENTS\) \{[\s\S]*?const requested = collegeInputs\[dept\];[\s\S]*?const available = availableStudentsByCollege\.get\(dept\)\?\.length \|\| 0;[\s\S]*?if \(requested > available\) \{[\s\S]*?return;\n\s*\}\n\s*\}/s,
  `for (const college of Array.from(selectedColleges)) {
      const requested = collegeInputs[college];
      const available = availableStudentsByCollege.get(college)?.length || 0;
      if (requested > available) {
        toast.error(\`Insufficient students in \${college}. Requested: \${requested}, Available: \${available}\`);
        return;
      }
    }`
);

content = content.replace(
  /DEPARTMENTS\.forEach\(dept => \{[\s\S]*?const count = collegeInputs\[dept\];[\s\S]*?if \(count > 0\) \{[\s\S]*?const studentList = \[\.\.\.\(availableStudentsByCollege\.get\(dept\) \|\| \[\]\)\];[\s\S]*?const selected = studentList\.slice\(0, count\);[\s\S]*?newAllocations\.push\(\{ dept, students: selected \}\);[\s\S]*?selected\.forEach\(s => newLocalIds\.add\(s\.id\)\);[\s\S]*?\}\n\s*\}\);/s,
  `Array.from(selectedColleges).forEach(college => {
      const count = collegeInputs[college];
      if (count > 0) {
        const studentList = [...(availableStudentsByCollege.get(college) || [])];
        const selected = studentList.slice(0, count);
        newAllocations.push({ college, students: selected });
        selected.forEach(s => newLocalIds.add(s.id));
      }
    });`
);

// 10. Layout engine mapping
content = content.replace(/const deptQueues = newAllocations\.map\(a => \(\{ dept: a\.dept, q: \[\.\.\.a\.students\] \}\)\);/g, `const collegeQueues = newAllocations.map(a => ({ college: a.college, q: [...a.students] }));`);
content = content.replace(/deptQueues/g, 'collegeQueues');
content = content.replace(/forbiddenDepts/g, 'forbiddenColleges');
content = content.replace(/forbiddenColleges = new Set\(neighbors\.map\(n => n!\.department\)\);/g, `forbiddenColleges = new Set(neighbors.map(n => n!.inst_name));`);
content = content.replace(/\!forbiddenColleges\.has\(dq\.dept\)/g, `!forbiddenColleges.has(dq.college)`);
content = content.replace(/dq\.dept/g, `dq.college`);

// 11. PDF updates 
content = content.replace(/a\.dept/g, 'a.college');
content = content.replace(/const branchSummary = uniqueDepts\.map\(d => getBranchName\(d\)\)\.join\(' & '\);/g, `const branchSummary = uniqueDepts.join(' & ');`);
content = content.replace(/const aisleDeptsInCol = Array\.from\([\s\S]*?as string\[\][\s\S]*?\)\n\s*\);/s, `const aisleDeptsInCol = Array.from(
          new Set(
            col.benches.flatMap(b =>
              [b.left?.inst_name, b.right?.inst_name].filter(Boolean) as string[]
            )
          )
        );`);
content = content.replace(/getDeptColor\(aisleDeptsInCol\[0\]\)/g, `getCollegeColor(aisleDeptsInCol[0], uniqueDepts)`);
content = content.replace(/BRANCH/g, 'COLLEGE');
content = content.replace(/getDeptColor\(bench\.left\.department\)/g, `getCollegeColor(bench.left.inst_name, uniqueDepts)`);
content = content.replace(/getDeptColor\(bench\.right\.department\)/g, `getCollegeColor(bench.right.inst_name, uniqueDepts)`);
content = content.replace(/uniqueDepts = Array\.from\(new Set\(room\.allocations\.map\(a => a\.college\)\)\);/g, `uniqueDepts = Array.from(new Set(room.allocations.map(a => a.college)));`);

content = content.replace(/const legendText = allDeptsInRoom\.map\(d => \`\$\{d\}: \$\{getBranchName\(d\)\}\`\)\.join\('   \|   '\);/g, `const legendText = allDeptsInRoom.join('   |   ');`);
content = content.replace(/allDeptsInRoom/g, 'allCollegesInRoom');
// 12. UI Step 3 rendering fixes
content = content.replace(/Step 3 — Department Selection/g, 'Step 3 — College Target Selection');
content = content.replace(/DEPARTMENTS\.forEach\(d =>/g, `Array.from(selectedColleges).forEach(d =>`);
content = content.replace(/DEPARTMENTS\.length === 0/g, `selectedColleges.size === 0`);
content = content.replace(/DEPARTMENTS\.map/g, `Array.from(selectedColleges).map`);
content = content.replace(/isLoadingDepts \? \([\s\S]*?Loading departments\.\.\.<\/div>\n\s*\) : /g, ``);
content = content.replace(/No departments found/g, 'No target colleges found');
content = content.replace(/dept\}/g, `college}`);
content = content.replace(/dept=/g, `college=`);
content = content.replace(/key=\{dept\}/g, `key={college}`);
content = content.replace(/handleCollegeInputChange\(dept, e\.target\.value\)/g, `handleCollegeInputChange(college, e.target.value)`);

// 13. UI Layout Rendering fixes
content = content.replace(/>\{a\.college\}<\/Badge>/g, `>{a.college}</Badge>`);
content = content.replace(/>\{student\.department\}<\/span>/g, `>{student.inst_name}</span>`);

fs.writeFileSync('app/pharmacy/page.tsx', content);
console.log('Refactor complete!');
