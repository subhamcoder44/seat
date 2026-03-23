'use client';

import { useState, useRef, useEffect } from 'react';
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
  const { students, addStudent, updateStudent, deleteStudent, loadFromLocalStorage } = useAppState();

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

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

        let successCount = 0;
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
            inst_id: getValue(['inst_id', 'institution id', 'inst id', 'institution_id']),
            inst_name: getValue(['inst_name', 'institution name', 'inst name', 'institution_name']),
            exam_centre_code: getValue(['exam centre code', 'centre code', 'exam_centre_code', 'exam_cen']),
            exam_centre_name: getValue(['exam centre name', 'centre name', 'exam_centre_name']),
            email: 'Exam-2024',
            rollRangeStart: '',
            rollRangeEnd: '',
            totalStudents: 1,
            seatingPlan: 'Just Uploaded',
          };
          console.log('Mapped student data:', studentData);
          await addStudent(studentData);
          successCount++;
        }
        
        if (successCount > 0) {
          toast.success(`Successfully registered ${successCount} departments from file`);
        } else {
          toast.error('No valid records found in file');
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

  const filteredDepts = students.filter(
    (dept) => {
      if (!dept) return false;
      const deptName = dept.name || '';
      return deptName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dept.id && dept.id.toLowerCase().includes(searchQuery.toLowerCase()));
    }
  );

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
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-2">Batch Registration Upload (CSV / Excel)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Quickly register multiple departments and student counts by uploading a CSV or Excel file.
                </p>
                <div className="border-[1.5px] border-dashed border-slate-300 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-900/50 rounded-lg p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-8 w-8 text-[#8ea4c8] stroke-[2]" />
                  <p className="text-[15px] font-medium text-[#1e3a5f] dark:text-slate-300 mb-1">Drop CSV/Excel file here or Click to select</p>
                  <Button variant="outline" className="bg-white dark:bg-slate-800 text-slate-900 font-medium dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 h-9 px-4 rounded-md shadow-sm" disabled={isLoading} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Upload & Preview Records</Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                  />
                </div>
              </div>

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
              </div>
            </Card>
          </div>

          {/* Right Panel: Table and Overview */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <Card className="flex-1 p-6 bg-card flex flex-col">
              <h2 className="text-xl font-semibold mb-6">Registration Records & Status</h2>
              
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search Reg. ID or Dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-md overflow-hidden flex-1">
                <Table>
                  <TableHeader className="bg-white dark:bg-slate-950 border-b-2 border-slate-200 dark:border-slate-800">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-900 dark:text-slate-100 py-3 whitespace-nowrap">sl. no.</TableHead>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 dark:hover:text-red-400" onClick={(e) => { e.stopPropagation(); setDeptToDelete(dept.id); }}>
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
              <div className="space-y-1 text-[#1a1f36] dark:text-slate-300 font-medium text-[15px]">
                <p>10-Oct: CE-III <span className="text-slate-500 font-normal">(planned: 8 students)</span> - Rooms Assigned</p>
                <p>12-Oct: CST-V <span className="text-slate-500 font-normal">(planned: 15 students)</span> - Rooms Assigned</p>
                <p>15-Oct: ME-IV <span className="text-slate-500 font-normal">(planned: 50 students)</span> - Allocation Pending</p>
                <p>EE-VI & BBA-II - Not Started</p>
                <p>Newly uploaded Chemical Eng. <span className="text-slate-500 font-normal">(20 students)</span> - Seating Plan Needed</p>
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
      </div>
    </MainLayout>
  );
}
