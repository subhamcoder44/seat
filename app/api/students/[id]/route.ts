import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const student = await Student.findByIdAndUpdate(id, body, { new: true });
    
    if (!student) {
      return NextResponse.json({ error: 'Student/Department not found' }, { status: 404 });
    }
    
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
      createdAt: student.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    await Student.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
