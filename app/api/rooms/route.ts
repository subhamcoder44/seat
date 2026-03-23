import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Room from '@/lib/models/Room';

export async function GET() {
  try {
    await dbConnect();
    const rooms = await Room.find({}).sort({ createdAt: -1 });
    const mapped = rooms.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      building: r.building,
      floor: r.floor,
      totalCapacity: r.totalCapacity,
      roomType: r.roomType,
      rows: r.rows,
      columns: r.columns,
      doorPosition: r.doorPosition,
      status: r.status,
      currentPlan: r.currentPlan,
      seats: r.seats,
      createdAt: r.createdAt.toISOString(),
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
    const { name, building, floor, totalCapacity, roomType, rows, columns, doorPosition, status } = body;

    // Generate seats grid
    const seats = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        seats.push({
          id: `seat-${row}-${col}`,
          row,
          column: col,
          studentId: null,
          status: 'available',
        });
      }
    }

    const room = await Room.create({
      name,
      building: building || 'A',
      floor: floor || 1,
      totalCapacity: totalCapacity || rows * columns,
      roomType: roomType || 'Standard',
      rows,
      columns,
      doorPosition: doorPosition || 'left',
      status: status || 'Available',
      currentPlan: 'No Plan',
      seats,
    });

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
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
