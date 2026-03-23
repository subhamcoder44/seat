import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';

export async function GET() {
  try {
    await dbConnect();
    const students = await Student.find({}).sort({ createdAt: -1 });
    const mapped = students.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      email: s.email,
      rollRangeStart: s.rollRangeStart,
      rollRangeEnd: s.rollRangeEnd,
      totalStudents: s.totalStudents,
      seatingPlan: s.seatingPlan,
      reg_no: s.reg_no,
      roll: s.roll,
      no: s.no,
      sem: s.sem,
      type: s.type,
      inst_id: s.inst_id,
      inst_name: s.inst_name,
      exam_centre_code: s.exam_centre_code,
      exam_centre_name: s.exam_centre_name,
      department: s.department || '',
      createdAt: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString(),
    }));
    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const student = await Student.create(body);
    return NextResponse.json({
      id: student._id.toString(),
      name: student.name,
      email: student.email,
      rollRangeStart: student.rollRangeStart,
      rollRangeEnd: student.rollRangeEnd,
      totalStudents: student.totalStudents,
      seatingPlan: student.seatingPlan,
      reg_no: student.reg_no,
      roll: student.roll,
      no: student.no,
      sem: student.sem,
      type: student.type,
      inst_id: student.inst_id,
      inst_name: student.inst_name,
      exam_centre_code: student.exam_centre_code,
      exam_centre_name: student.exam_centre_name,
      department: student.department || '',
      createdAt: student.createdAt ? student.createdAt.toISOString() : new Date().toISOString(),
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
