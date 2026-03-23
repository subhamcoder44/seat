'use client';

import { useEffect, useState } from 'react';
import { useAppState } from '@/hooks/use-app-state';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const { rooms, students, loadFromLocalStorage } = useAppState();
  const [reportData, setReportData] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    // Generate report data
    const data = rooms.map(room => {
      const allocatedSeats = room.seats.filter(s => s.studentId).length;
      const occupancyPercent = Math.round((allocatedSeats / room.seats.length) * 100);
      return {
        name: `${room.name} (${room.building || 'A'})`,
        allocated: allocatedSeats,
        available: room.seats.length - allocatedSeats,
        occupancy: occupancyPercent,
      };
    });

    const occupancy = [
      {
        name: 'Allocated',
        value: rooms.reduce((sum, r) => sum + r.seats.filter(s => s.studentId).length, 0),
      },
      {
        name: 'Available',
        value:
          rooms.reduce((sum, r) => sum + r.seats.length, 0) -
          rooms.reduce((sum, r) => sum + r.seats.filter(s => s.studentId).length, 0),
      },
    ];

    setReportData(data);
    setOccupancyData(occupancy);
  }, [rooms]);

  const totalSeats = rooms.reduce((sum, r) => sum + r.seats.length, 0);
  const totalAllocated = rooms.reduce((sum, r) => sum + r.seats.filter(s => s.studentId).length, 0);
  const overallOccupancy = totalSeats > 0 ? Math.round((totalAllocated / totalSeats) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const content = `
Exam Seat Management Report
Generated: ${new Date().toLocaleString()}

SUMMARY
Total Rooms: ${rooms.length}
Total Students: ${students.length}
Total Seats: ${totalSeats}
Allocated Seats: ${totalAllocated}
Available Seats: ${totalSeats - totalAllocated}
Overall Occupancy: ${overallOccupancy}%

ROOM DETAILS
${rooms.map(room => {
  const allocatedSeats = room.seats.filter(s => s.studentId).length;
  const occupancyPercent = Math.round((allocatedSeats / room.seats.length) * 100);
  return `
Room: ${room.name}
Layout: ${room.rows} × ${room.columns}
Total Seats: ${room.seats.length}
Allocated: ${allocatedSeats}
Available: ${room.seats.length - allocatedSeats}
Occupancy: ${occupancyPercent}%

Students in ${room.name}:
${room.seats
  .filter(s => s.studentId)
  .map(s => {
    const student = students.find(st => st.id === s.studentId);
    return `  ${s.id}: ${student?.name} (${student?.roll || student?.reg_no})`;
  })
  .join('\n')}
`;
}).join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${Date.now()}.txt`;
    a.click();
    toast.success('Report exported');
  };

  const COLORS = ['oklch(0.57 0.17 262.5)', 'oklch(0.28 0 0)'];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            View seat allocation statistics and room occupancy
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer size={18} />
            Print
          </Button>
          <Button onClick={handleExportPDF} className="gap-2">
            <Download size={18} />
            Export Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total Seats</p>
            <p className="text-3xl font-bold text-foreground mt-2">{totalSeats}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Allocated Seats</p>
            <p className="text-3xl font-bold text-primary mt-2">{totalAllocated}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Occupancy Rate</p>
            <p className="text-3xl font-bold text-accent mt-2">{overallOccupancy}%</p>
          </Card>
        </div>

        {/* Charts */}
        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card className="p-6">
              <h2 className="font-bold text-lg mb-4">Room Occupancy</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="allocated" fill="var(--color-primary)" name="Allocated" />
                  <Bar dataKey="available" fill="var(--color-secondary)" name="Available" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Pie Chart */}
            <Card className="p-6">
              <h2 className="font-bold text-lg mb-4">Overall Allocation</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={occupancyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {occupancyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed">
            <p className="text-lg font-semibold text-foreground">No data available</p>
            <p className="text-muted-foreground mt-2">Create rooms and allocate students to view reports</p>
          </Card>
        )}

        {/* Room Details Table */}
        {rooms.length > 0 && (
          <Card className="p-6">
            <h2 className="font-bold text-lg mb-4">Room Details</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-muted-foreground">Room</th>
                    <th className="text-right p-3 text-muted-foreground">Layout</th>
                    <th className="text-right p-3 text-muted-foreground">Total</th>
                    <th className="text-right p-3 text-muted-foreground">Allocated</th>
                    <th className="text-right p-3 text-muted-foreground">Available</th>
                    <th className="text-right p-3 text-muted-foreground">Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-secondary">
                      <td className="p-3 font-semibold text-foreground">{row.name}</td>
                      <td className="text-right p-3 text-muted-foreground">
                        {rooms[idx]?.rows} × {rooms[idx]?.columns}
                      </td>
                      <td className="text-right p-3 text-foreground">{row.allocated + row.available}</td>
                      <td className="text-right p-3 text-primary font-semibold">{row.allocated}</td>
                      <td className="text-right p-3 text-accent font-semibold">{row.available}</td>
                      <td className="text-right p-3 font-semibold text-foreground">{row.occupancy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
