'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAppState, Student } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit2, Eye, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function DepartmentPlannerPage() {
  const { students, globalFilters, setGlobalFilters, addStudent, addStudentsBulk, updateStudent, deleteStudent, deleteAllStudents, fetchData, resetFilters } = useAppState();

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    reg_no: '',
    roll: '',
    no: '',
    sem: '',
    type: '',
    inst_id: '',
    inst_name: '',
    exam_centre_code: '',
    exam_centre_name: '',
    department: '',
    email: 'Midterm-Oct',
    rollRangeStart: '',
    rollRangeEnd: '',
    totalStudents: 0,
    seatingPlan: 'Not Started' as Student['seatingPlan'],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<Student | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [bulkInstName, setBulkInstName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    // Fetch distinct departments from DB
    fetch('/api/students?departments=true')
      .then(r => r.json())
      .then((depts: string[]) => setAvailableDepartments(depts))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Student Name is required');
      return;
    }
    
    setIsLoading(true);
    try {
      if (formData.id) {
        await updateStudent(formData.id, formData as any);
        toast.success('Record updated successfully');
      } else {
        await addStudent(formData as any);
        toast.success('Record saved successfully');
      }
      handleClear();
    } catch (error) {
      toast.error('Failed to save record');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!data) return;

        // Parse file using xlsx (works for both CSV and Excel)
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of objects using headers
        const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet);
        console.log('JSON Rows from file:', jsonRows);
        
        if (jsonRows.length === 0) {
          toast.error('File is empty or no data found');
          return;
        }

        const allStudentsData: any[] = [];
        for (const row of jsonRows) {
          console.log('Processing row:', row);
          // Robust mapping: check for various header variations
          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const cleanTarget = key.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              const foundKey = rowKeys.find(k => {
                const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                // Check exact match, or if cleanKey includes cleanTarget, or if cleanTarget is 'roll' and key includes 'roll'
                return cleanKey === cleanTarget || 
                       (cleanTarget.length > 2 && cleanKey.includes(cleanTarget)) ||
                       (cleanTarget === 'roll' && cleanKey.includes('roll')) ||
                       (cleanTarget === 'regno' && cleanKey.includes('reg'));
              });
              if (foundKey) return String(row[foundKey] || '').trim();
            }
            return '';
          };

        const name = getValue(['name', 'student name', 'student_name']);
        console.log('Mapped name:', name);
        if (!name) continue; // Skip rows without a name

        const studentData = {
          name,
          reg_no: getValue(['reg_no', 'registration no', 'reg no', 'registration_no']),
          roll: getValue(['roll', 'roll no', 'roll_no']),
          no: getValue(['no', 'number', 'sl no', 'sl_no']),
          sem: getValue(['sem', 'semester']),
          type: getValue(['type', 'student type', 'student_type']),
          department: getValue(['department', 'dept', 'branch', 'branch name']),
          inst_id: getValue(['inst_id', 'institution id', 'inst id', 'institution_id', 'institute id', 'institute_id', 'instituteid']),
          inst_name: bulkInstName.trim() || getValue(['inst_name', 'institution name', 'inst name', 'institution_name', 'institute name', 'institute_name', 'institute', 'college', 'college name']),
          exam_centre_code: getValue(['exam centre code', 'centre code', 'exam_centre_code', 'exam_cen']),
          exam_centre_name: getValue(['exam centre name', 'centre name', 'exam_centre_name']),
          email: 'Exam-2024',
          rollRangeStart: '',
          rollRangeEnd: '',
          totalStudents: 1,
          seatingPlan: 'Just Uploaded' as const,
        };
        allStudentsData.push(studentData);
      }

      if (allStudentsData.length > 0) {
        console.log(`Attempting to upload ${allStudentsData.length} students in bulk...`);
        await addStudentsBulk(allStudentsData);
        toast.success(`Successfully uploaded ${allStudentsData.length} students to database`);
        
        // Refresh departments list from DB
        fetch('/api/students?departments=true')
          .then(r => r.json())
          .then((depts: string[]) => setAvailableDepartments(depts))
          .catch(() => {});
      } else {
        toast.error('No valid records found in file. Make sure your file has a "name" column.');
      }
    } catch (err) {
        toast.error('Failed to parse file. Please ensure it is a valid CSV or Excel file.');
        console.error(err);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClear = () => {
    setFormData({
      id: '',
      name: '',
      reg_no: '',
      roll: '',
      no: '',
      sem: '',
      type: '',
      inst_id: '',
      inst_name: '',
      exam_centre_code: '',
      exam_centre_name: '',
      department: '',
      email: 'Midterm-Oct',
      rollRangeStart: '',
      rollRangeEnd: '',
      totalStudents: 0,
      seatingPlan: 'Not Started',
    });
    setSelectedDept(null);
  };

  const handleEdit = (dept: Student) => {
    setFormData({
      id: dept.id,
      name: dept.name,
      reg_no: dept.reg_no || '',
      roll: dept.roll || '',
      no: dept.no || '',
      sem: dept.sem || '',
      type: dept.type || '',
      inst_id: dept.inst_id || '',
      inst_name: dept.inst_name || '',
      exam_centre_code: dept.exam_centre_code || '',
      exam_centre_name: dept.exam_centre_name || '',
      department: (dept as any).department || '',
      email: dept.email || 'Midterm-Oct',
      rollRangeStart: dept.rollRangeStart || '',
      rollRangeEnd: dept.rollRangeEnd || '',
      totalStudents: dept.totalStudents || 0,
      seatingPlan: dept.seatingPlan || 'Not Started',
    });
    setSelectedDept(dept);
  };

  const handleDelete = async () => {
    if (!deptToDelete) return;
    try {
      await deleteStudent(deptToDelete);
      toast.success('Record deleted successfully');
      if (formData.id === deptToDelete) {
        handleClear();
      }
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setDeptToDelete(null);
    }
  };
  
  const handleDeleteAll = async () => {
    setIsLoading(true);
    try {
      await deleteAllStudents();
      toast.success('All records deleted successfully');
      handleClear();
    } catch (error) {
      toast.error('Failed to delete all records');
    } finally {
      setIsLoading(false);
      setShowDeleteAllConfirm(false);
    }
  };

  const availableSemesters = useMemo(() => {
    const sems = new Set(students.map(s => s.sem).filter(Boolean));
    return Array.from(sems).sort();
  }, [students]);

  const availableColleges = useMemo(() => {
    const colleges = new Set(students.map(s => s.inst_name).filter(Boolean));
    return Array.from(colleges).sort();
  }, [students]);

  const filteredDepts = students.filter((dept) => {
    if (!dept) return false;
    const deptName = dept.name || '';
    const deptDept = (dept as any).department || '';
    const matchesSearch =
      deptName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.reg_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.roll || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      deptDept.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept =
      globalFilters.department === 'all' || deptDept === globalFilters.department;
    const matchesSem =
      globalFilters.semester.includes('all') || globalFilters.semester.length === 0 || globalFilters.semester.includes(dept.sem);
    const matchesCollege =
      globalFilters.college === 'all' || (dept.inst_name === globalFilters.college);
    const matchesType =
      globalFilters.type === 'all' || (dept.type === globalFilters.type);
    return matchesSearch && matchesDept && matchesSem && matchesCollege && matchesType;
  });

  const statusOverview = useMemo(() => {
    const groups: Record<string, { count: number, status: Student['seatingPlan'], dept: string, sem: string }> = {};
    
    students.forEach(s => {
      const dept = (s as any).department || 'Unknown';
      const sem = s.sem || 'N/A';
      const key = `${dept}-${sem}`;
      if (!groups[key]) {
        groups[key] = { count: 0, status: s.seatingPlan || 'Not Started', dept, sem };
      }
      groups[key].count += 1;
    });

    return Object.values(groups).sort((a, b) => a.dept.localeCompare(b.dept));
  }, [students]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'bg-emerald-200 text-emerald-900 border-none dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'Pending': return 'bg-red-500/80 text-white border-none dark:bg-red-900/50 dark:text-red-300';
      case 'Not Started': return 'bg-slate-300 text-slate-800 border-none dark:bg-slate-700 dark:text-slate-300';
      case 'In Progress': return 'bg-yellow-400 text-yellow-900 border-none dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'Just Uploaded': return 'bg-sky-200 text-sky-900 border-none dark:bg-sky-900/40 dark:text-sky-300';
      default: return 'bg-slate-300 text-slate-800 border-none';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Department Registration Planner</h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Panel: Form */}
          <div className="xl:col-span-4 space-y-6">
            <Card className="p-6 bg-card border">
              <h2 className="text-xl font-semibold mb-6">Data Entry Options</h2>

              <div>
                <h3 className="text-lg font-medium mb-4">Single Record Entry</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>reg_no</Label>
                      <Input 
                        value={formData.reg_no} 
                        onChange={(e) => setFormData({ ...formData, reg_no: e.target.value })} 
                        placeholder="Registration No"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>name</Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="Student Name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>roll</Label>
                      <Input 
                        value={formData.roll} 
                        onChange={(e) => setFormData({ ...formData, roll: e.target.value })} 
                        placeholder="Roll"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>no</Label>
                      <Input 
                        value={formData.no} 
                        onChange={(e) => setFormData({ ...formData, no: e.target.value })} 
                        placeholder="No"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>sem</Label>
                      <Input 
                        value={formData.sem} 
                        onChange={(e) => setFormData({ ...formData, sem: e.target.value })} 
                        placeholder="Semester"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>type</Label>
                      <Input 
                        value={formData.type} 
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                        placeholder="Type"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>inst_id</Label>
                      <Input 
                        value={formData.inst_id} 
                        onChange={(e) => setFormData({ ...formData, inst_id: e.target.value })} 
                        placeholder="Inst ID"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>inst_name</Label>
                    <Input 
                      value={formData.inst_name} 
                      onChange={(e) => setFormData({ ...formData, inst_name: e.target.value })} 
                      placeholder="Institution Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input 
                      value={formData.department} 
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                      placeholder="e.g. Computer Science, Mechanical..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Exam Centre Code</Label>
                      <Input 
                        value={formData.exam_centre_code} 
                        onChange={(e) => setFormData({ ...formData, exam_centre_code: e.target.value })} 
                        placeholder="Centre Code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Exam Centre Name</Label>
                      <Input 
                        value={formData.exam_centre_name} 
                        onChange={(e) => setFormData({ ...formData, exam_centre_name: e.target.value })} 
                        placeholder="Centre Name"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button onClick={handleSave} disabled={isLoading} className="bg-[#1a1f36] hover:bg-[#2a314d] text-white px-8">
                      {isLoading ? 'Saving...' : 'Save Record'}
                    </Button>
                    <Button variant="outline" onClick={handleClear} disabled={isLoading} className="px-8">
                      Clear Form
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t mt-6">
                  <h3 className="text-lg font-medium mb-4 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Bulk Records Import
                  </h3>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Upload an Excel (.xlsx) or CSV file with student records. The system will automatically map columns like name, roll, reg no, etc.
                    </p>
                    <div className="space-y-2">
                      <Label>Institution Name (Optional)</Label>
                      <Input 
                        placeholder="Apply this institution name to all uploaded records"
                        value={bulkInstName}
                        onChange={(e) => setBulkInstName(e.target.value)}
                      />
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept=".csv, .xlsx, .xls" 
                      className="hidden" 
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={isLoading}
                      variant="outline"
                      className="w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 flex items-center justify-center gap-2 h-12"
                    >
                      <Upload className="h-4 w-4" />
                      {isLoading ? 'Processing File...' : 'Select Excel / CSV File'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Panel: Table and Overview */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <Card className="flex-1 p-6 bg-card flex flex-col">
              <h2 className="text-xl font-semibold mb-6">Registration Records & Status</h2>
              
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search name, reg no, roll..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {/* Global Filters Display */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="px-3 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">College:</span>
                    <span className="text-[10px] font-bold">{globalFilters.college === 'all' ? 'All' : globalFilters.college}</span>
                  </div>
                  <div className="px-3 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Sem:</span>
                    <span className="text-[10px] font-bold">
                      {globalFilters.semester.includes('all') || globalFilters.semester.length === 0 
                        ? 'All' 
                        : globalFilters.semester.sort().join(', ')}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Dept:</span>
                    <span className="text-[10px] font-bold">{globalFilters.department === 'all' ? 'All' : globalFilters.department}</span>
                  </div>
                  <div className="px-3 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Type:</span>
                    <span className="text-[10px] font-bold">{globalFilters.type === 'all' ? 'All' : globalFilters.type}</span>
                  </div>
                </div>
                {(globalFilters.department !== 'all' || (globalFilters.semester.length > 0 && !globalFilters.semester.includes('all')) || globalFilters.college !== 'all' || globalFilters.type !== 'all') && (
                  <Button variant="outline" size="sm" onClick={resetFilters} className="whitespace-nowrap">
                    Clear Global Filters
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setShowDeleteAllConfirm(true)}
                  disabled={students.length === 0 || isLoading}
                  className="whitespace-nowrap flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden flex-1">
                <Table>
                  <TableHeader className="bg-white dark:bg-slate-950 border-b-2 border-slate-200 dark:border-slate-800">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">sl. no.</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">Department</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">reg_no</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">name</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">roll</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">no</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">sem</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">type</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">inst_id</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">inst_name</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">Exam Centre Code</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">Exam Centre Name</TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          No registration records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDepts.map((dept, idx) => {
                        return (
                          <TableRow key={dept.id || `dept-${idx}`} className="cursor-pointer hover:bg-slate-50 transition-colors dark:hover:bg-slate-800/50" onClick={() => handleEdit(dept)}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              {(dept as any).department ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap">
                                  {(dept as any).department}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>{dept.reg_no || '-'}</TableCell>
                            <TableCell className="font-medium">{dept.name}</TableCell>
                            <TableCell>{dept.roll || '-'}</TableCell>
                            <TableCell>{dept.no || '-'}</TableCell>
                            <TableCell>{dept.sem || '-'}</TableCell>
                            <TableCell>{dept.type || '-'}</TableCell>
                            <TableCell>{dept.inst_id || '-'}</TableCell>
                            <TableCell>{dept.inst_name || '-'}</TableCell>
                            <TableCell>{dept.exam_centre_code || '-'}</TableCell>
                            <TableCell>{dept.exam_centre_name || '-'}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onClick={(e) => { e.stopPropagation(); handleEdit(dept); }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onClick={(e) => { e.stopPropagation(); handleEdit(dept); }}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20" title="Delete Student" onClick={(e) => { e.stopPropagation(); setDeptToDelete(dept.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <h2 className="text-lg font-semibold mb-4">Seating Allocation Status Overview</h2>
              <div className="space-y-2 text-[#1a1f36] dark:text-slate-300 font-medium text-[15px]">
                {statusOverview.length === 0 ? (
                  <p className="text-muted-foreground font-normal">No student records imported yet.</p>
                ) : (
                  statusOverview.map((group, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
                      <div>
                        <span>{group.dept} - {group.sem}</span>
                        <span className="text-slate-500 font-normal ml-2">({group.count} students)</span>
                      </div>
                      <Badge variant="secondary" className={getStatusColor(group.status || 'Not Started')}>
                        {group.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={deptToDelete !== null} onOpenChange={(open) => !open && setDeptToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the registration record. This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-4 mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete All Confirmation */}
        <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
          <AlertDialogContent>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete All Students?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-bold text-foreground">{students.length}</span> registration records. This action cannot be undone and will clear all student data from the database.
            </AlertDialogDescription>
            <div className="flex gap-4 mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete All
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
