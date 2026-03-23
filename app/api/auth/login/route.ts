import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Teacher from '@/lib/models/Teacher';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Find teacher by email and password (simple check, no hashing)
    let teacher = await Teacher.findOne({ email, password });

    if (!teacher) {
      // Check if teacher exists but wrong password
      const existingTeacher = await Teacher.findOne({ email });
      if (existingTeacher) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Auto-create teacher for any new email/password combo (matching original behavior)
      teacher = await Teacher.create({
        email,
        password,
        name: email.split('@')[0],
      });
    }

    return NextResponse.json({
      id: teacher._id.toString(),
      email: teacher.email,
      name: teacher.name,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
