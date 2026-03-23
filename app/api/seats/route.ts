import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Room from '@/lib/models/Room';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { roomId, seatId, studentId } = await req.json();

    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const seatIndex = room.seats.findIndex((s: any) => s.id === seatId);
    if (seatIndex === -1) {
      return NextResponse.json({ error: 'Seat not found' }, { status: 404 });
    }

    if (studentId) {
      // Allocate
      room.seats[seatIndex].studentId = studentId;
      room.seats[seatIndex].status = 'occupied';
    } else {
      // Deallocate
      room.seats[seatIndex].studentId = null;
      room.seats[seatIndex].status = 'available';
    }

    await room.save();

    return NextResponse.json({
      id: room._id.toString(),
      name: room.name,
      rows: room.rows,
      columns: room.columns,
      seats: room.seats,
      createdAt: room.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
