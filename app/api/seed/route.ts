import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Teacher from '@/lib/models/Teacher';

export async function POST() {
  try {
    await dbConnect();

    // Seed demo teacher if not exists
    const existing = await Teacher.findOne({ email: 'teacher@exam.com' });
    if (!existing) {
      await Teacher.create({
        email: 'teacher@exam.com',
        name: 'John Doe',
        password: 'password123',
      });
      return NextResponse.json({ message: 'Demo teacher seeded successfully' }, { status: 201 });
    }

    return NextResponse.json({ message: 'Demo teacher already exists' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
