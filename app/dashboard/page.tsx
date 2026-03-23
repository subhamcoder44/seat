'use client';

import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SeatingAllocationStatus } from '@/components/dashboard/SeatingAllocationStatus';
import { Users, DoorOpen, Grid3x3, BarChart3, Plus, Package } from 'lucide-react';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { rooms, students, loadFromLocalStorage } = useAppState();
  const { user } = useAuth();

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  const totalSeats = rooms.reduce((sum, room) => sum + room.seats.length, 0);
  const allocatedSeats = rooms.reduce(
    (sum, room) => sum + room.seats.filter(seat => seat.studentId).length,
    0
  );

  const stats = [
    {
      label: 'Total Rooms',
      value: rooms.length,
      icon: DoorOpen,
      href: '/rooms',
    },
    {
      label: 'Total Students',
      value: students.length,
      icon: Users,
      href: '/students',
    },
    {
      label: 'Allocated Seats',
      value: allocatedSeats,
      icon: Grid3x3,
      href: '/seats',
    },
    {
      label: 'Available Seats',
      value: totalSeats - allocatedSeats,
      icon: BarChart3,
      href: '/reports',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground mt-2">
            Manage your exam seating arrangements efficiently
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.href} href={stat.href}>
                <Card className="p-6 hover:border-primary transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                    </div>
                    <Icon className="text-primary opacity-20" size={32} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/rooms">
              <Button className="w-full h-auto py-4 text-base" size="lg">
                <Plus className="mr-2" size={20} />
                Create New Room
              </Button>
            </Link>
            <Link href="/students">
              <Button variant="outline" className="w-full h-auto py-4 text-base" size="lg">
                <Plus className="mr-2" size={20} />
                Add Students
              </Button>
            </Link>
            <Link href="/seats">
              <Button variant="outline" className="w-full h-auto py-4 text-base" size="lg">
                <Grid3x3 className="mr-2" size={20} />
                Allocate Seats
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full h-auto py-4 text-base" size="lg">
                <BarChart3 className="mr-2" size={20} />
                View Reports
              </Button>
            </Link>
            <Link href="/packet-list">
              <Button variant="outline" className="w-full h-auto py-4 text-base" size="lg">
                <Package className="mr-2" size={20} />
                Packet List
              </Button>
            </Link>
          </div>
        </div>


        {/* Seating Allocation Status Overview */}
        <SeatingAllocationStatus />

        {/* Empty State */}
        {rooms.length === 0 && (
          <Card className="p-12 text-center border-dashed">
            <DoorOpen size={48} className="mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No rooms created yet</h3>
            <p className="text-muted-foreground mb-6">
              Get started by creating your first exam room
            </p>
            <Link href="/rooms">
              <Button>Create Room</Button>
            </Link>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
