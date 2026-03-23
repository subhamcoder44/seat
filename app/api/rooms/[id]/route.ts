import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Room from '@/lib/models/Room';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    // If rows/columns changed, regenerate seats
    if (body.rows !== undefined && body.columns !== undefined) {
      const seats = [];
      for (let row = 0; row < body.rows; row++) {
        for (let col = 0; col < body.columns; col++) {
          seats.push({
            id: `seat-${row}-${col}`,
            row,
            column: col,
            studentId: null,
            status: 'available',
          });
        }
      }
      body.seats = seats;
    }

    const room = await Room.findByIdAndUpdate(id, body, { new: true });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json({
      id: room._id.toString(),
      name: room.name,
      building: room.building,
      floor: room.floor,
      totalCapacity: room.totalCapacity,
      roomType: room.roomType,
      rows: room.rows,
      columns: room.columns,
      doorPosition: room.doorPosition,
      status: room.status,
      currentPlan: room.currentPlan,
      seats: room.seats,
      createdAt: room.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    await Room.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
