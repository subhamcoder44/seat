import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/lib/models/Student';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const distinctDepts = searchParams.get('departments');

    // Return list of distinct department values
    if (distinctDepts === 'true') {
      const depts = await Student.distinct('department');
      return NextResponse.json(depts.filter(Boolean).sort());


      
    }


    const query: Record<string, any> = {};
    if (department && department !== 'all') {
      query.department = department;
    }

    const students = await Student.find(query).sort({ createdAt: -1 });
    const mapped = students.map((s) => {
      try {
        return {
          id: s._id ? s._id.toString() : Math.random().toString(36).substring(7),
          name: s.name || 'Unknown',
          email: s.email || '',
          rollRangeStart: s.rollRangeStart || '',
          rollRangeEnd: s.rollRangeEnd || '',
          totalStudents: s.totalStudents || 0,
          seatingPlan: s.seatingPlan || 'Not Started',
          reg_no: s.reg_no || '',
          roll: s.roll || '',
          no: s.no || '',
          sem: s.sem || '',
          type: s.type || '',
          inst_id: s.inst_id || '',
          inst_name: s.inst_name || '',
          exam_centre_code: s.exam_centre_code || '',
          exam_centre_name: s.exam_centre_name || '',
          department: s.department || '',
          createdAt: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString(),
        };
      } catch (err) {
        console.error('Error mapping student:', s, err);
        return null;
      }
    }).filter(Boolean);
    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    
    // Handle bulk insertion
    if (Array.isArray(body)) {
      const results = [];
      for (const studentData of body) {
        // Upsert based on roll and reg_no if they exist
        const query: any = {};
        if (studentData.roll) query.roll = studentData.roll;
        else if (studentData.reg_no) query.reg_no = studentData.reg_no;
        else query.name = studentData.name; // Fallback to name if ID-like fields are missing

        const student = await Student.findOneAndUpdate(
          query,
          { $set: studentData },
          { upsert: true, new: true, runValidators: true }
        );
        results.push(student);
      }
      return NextResponse.json({ success: true, count: results.length, students: results }, { status: 201 });
    }

    // Handle single insertion (existing logic with upsert)
    const query: any = {};
    if (body.roll) query.roll = body.roll;
    else if (body.reg_no) query.reg_no = body.reg_no;
    else query.name = body.name;

    const student = await Student.findOneAndUpdate(
      query,
      { $set: body },
      { upsert: true, new: true, runValidators: true }
    );
    
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

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const result = await Student.deleteMany({});
    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
