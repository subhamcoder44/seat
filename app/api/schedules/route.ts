import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Schedule from '@/lib/models/Schedule';

export async function GET() {
  try {
    await dbConnect();
    const schedules = await Schedule.find({}).sort({ date: 1, time: 1 });
    const mapped = schedules.map(s => ({
      id: s._id.toString(),
      date: s.date,
      time: s.time,
      semesters: s.semesters,
      createdAt: s.createdAt.toISOString(),
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
    const schedule = await Schedule.create(body);
    return NextResponse.json({
      id: schedule._id.toString(),
      date: schedule.date,
      time: schedule.time,
      semesters: schedule.semesters,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (id) {
      await Schedule.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }
    
    await Schedule.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
